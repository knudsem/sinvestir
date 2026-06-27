import type { Contribution, TimelinePoint, SimulationMetrics } from "./types.js";
import { parseUTCDate } from "./dateUtils.js";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

// Prix moyen payé par unité sur l'ensemble des apports (le prix de revient).
export function computeAverageBuyPrice(totalInvested: number, totalUnits: number): number {
  if (totalUnits <= 0) return 0;
  return totalInvested / totalUnits;
}

// Pire baisse pic-à-creux de la valeur de marché du portefeuille sur la période,
// renvoyée sous forme de ratio positif (0.5 signifie que le portefeuille a chuté
// de cinquante pour cent depuis un pic antérieur, au pire moment). C'est
// l'indicateur de risque phare pour un actif volatil comme la crypto.
export function computeMaxDrawdown(timeline: TimelinePoint[]): number {
  let peak = 0;
  let maxDrawdown = 0;
  for (const point of timeline) {
    if (point.value > peak) peak = point.value;
    if (peak > 0) {
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
}

// Part des jours où la valeur de marché du portefeuille était au moins égale à
// l'argent investi jusque-là. Un chiffre élevé signifie que la position est
// rarement restée sous l'eau, ce qui est un signal de risque plus intuitif pour
// un épargnant que la volatilité brute.
export function computeTimeInProfit(timeline: TimelinePoint[]): number {
  if (timeline.length === 0) return 0;
  let daysInProfit = 0;
  for (const point of timeline) {
    if (point.value >= point.invested) daysInProfit += 1;
  }
  return daysInProfit / timeline.length;
}

// Volatilité annualisée des rendements journaliers de l'actif. On mesure la
// dispersion des variations de prix au jour le jour (et non celle de la valeur du
// portefeuille, qui sauterait à chaque apport), puis on l'annualise. C'est la
// mesure de risque de référence pour comparer des actifs entre eux.
export function computeAnnualizedVolatility(dailyPrices: number[]): number {
  const returns: number[] = [];
  for (let i = 1; i < dailyPrices.length; i++) {
    const prev = dailyPrices[i - 1];
    if (prev > 0) returns.push(dailyPrices[i] / prev - 1);
  }
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) * (r - mean), 0) / (returns.length - 1);
  const dailyVolatility = Math.sqrt(variance);
  return dailyVolatility * Math.sqrt(DAYS_PER_YEAR);
}

// Plus haute valeur de marché atteinte par le portefeuille, et la date de ce
// sommet. Utile pour montrer concrètement l'ampleur des montagnes russes vécues.
export function computePeak(timeline: TimelinePoint[]): { value: number; date: string } {
  let best = { value: 0, date: "" };
  for (const point of timeline) {
    if (point.value > best.value) best = { value: point.value, date: point.date };
  }
  return best;
}

// Rendement annualisé pondéré par les flux (XIRR). Chaque apport est un flux
// sortant à sa date et la valeur finale du portefeuille est un unique flux entrant
// à la date de fin. On résout le taux annuel r pour lequel la valeur actuelle
// nette de ces flux est nulle.
//
// C'est la bonne façon de comparer des rendements entre différents calendriers.
// Un CAGR naïf sur le total investi surestimerait un DCA, car tout l'argent n'a
// pas été investi sur toute la période. Pour un investissement unique, le XIRR se
// réduit exactement au CAGR standard.
export function computeAnnualizedReturn(
  contributions: Contribution[],
  finalValue: number,
  effectiveStartDate: string,
  effectiveEndDate: string
): number {
  if (contributions.length === 0) return 0;

  const totalInvested = contributions.reduce((sum, c) => sum + c.amountInvested, 0);
  if (totalInvested <= 0) return 0;
  // Un portefeuille réduit à néant est une perte totale : le rendement est de
  // moins cent pour cent.
  if (finalValue <= 0) return -1;

  const startMs = parseUTCDate(effectiveStartDate).getTime();
  const endMs = parseUTCDate(effectiveEndDate).getTime();
  const totalYears = (endMs - startMs) / (MS_PER_DAY * DAYS_PER_YEAR);

  // Annualiser une fenêtre plus courte qu'une journée n'a aucun sens et explose
  // numériquement, donc on retombe sur le rendement total simple dans ce cas
  // dégénéré.
  if (totalYears <= 1 / DAYS_PER_YEAR) {
    return finalValue / totalInvested - 1;
  }

  const flows = contributions.map((c) => ({
    amount: -c.amountInvested,
    years: (parseUTCDate(c.date).getTime() - startMs) / (MS_PER_DAY * DAYS_PER_YEAR),
  }));
  flows.push({ amount: finalValue, years: totalYears });

  const npv = (rate: number): number =>
    flows.reduce((sum, flow) => sum + flow.amount / Math.pow(1 + rate, flow.years), 0);
  const npvSlope = (rate: number): number =>
    flows.reduce(
      (sum, flow) => sum + (-flow.years * flow.amount) / Math.pow(1 + rate, flow.years + 1),
      0
    );

  // Méthode de Newton avec une estimation de départ encadrée.
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    if (Math.abs(value) < 1e-7) return rate;
    const slope = npvSlope(rate);
    if (slope === 0 || !Number.isFinite(slope)) break;
    let next = rate - value / slope;
    // Garder le taux strictement au-dessus de moins un pour que le facteur
    // d'actualisation reste défini.
    if (next <= -0.999999) next = (rate - 0.999999) / 2;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Repli par bissection pour les cas où Newton ne converge pas.
  return findRateByBisection(npv);
}

// Solveur robuste par encadrement, utilisé quand la méthode de Newton ne converge
// pas. Exporté pour les tests unitaires directs ; il ne fait volontairement pas
// partie de la surface publique.
export function findRateByBisection(npv: (rate: number) => number): number {
  let low = -0.999999;
  let high = 10;
  let fLow = npv(low);
  let fHigh = npv(high);

  // Élargir la borne haute jusqu'à encadrer la racine ou abandonner.
  let expansions = 0;
  while (fLow * fHigh > 0 && high < 1e6 && expansions < 60) {
    high *= 2;
    fHigh = npv(high);
    expansions += 1;
  }
  if (fLow * fHigh > 0) return 0;

  for (let i = 0; i < 250; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

// Compose toutes les analyses dérivées pour une simulation terminée.
export function computeMetrics(params: {
  contributions: Contribution[];
  timeline: TimelinePoint[];
  dailyPrices: number[];
  totalInvested: number;
  totalUnits: number;
  finalValue: number;
  effectiveStartDate: string;
  effectiveEndDate: string;
}): SimulationMetrics {
  const peak = computePeak(params.timeline);
  return {
    contributionCount: params.contributions.length,
    averageBuyPrice: computeAverageBuyPrice(params.totalInvested, params.totalUnits),
    annualizedReturn: computeAnnualizedReturn(
      params.contributions,
      params.finalValue,
      params.effectiveStartDate,
      params.effectiveEndDate
    ),
    maxDrawdown: computeMaxDrawdown(params.timeline),
    timeInProfit: computeTimeInProfit(params.timeline),
    volatility: computeAnnualizedVolatility(params.dailyPrices),
    peakValue: peak.value,
    peakDate: peak.date,
  };
}
