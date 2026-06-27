import type {
  SimulationInput,
  SimulationResult,
  Contribution,
  TimelinePoint,
  PricePoint,
} from "./types.js";
import {
  parseUTCDate,
  formatUTCDate,
  addDays,
  minDate,
  maxDate,
} from "./dateUtils.js";
import { buildDenseSeries } from "./priceSeries.js";
import { generateContributionDates } from "./schedule.js";
import { computeMetrics } from "./metrics.js";

// Exécute une simulation d'investissement complète à partir d'une entrée
// utilisateur et d'une série de prix journalière.
//
// La même fonction couvre le mode unique ("once") et le mode récurrent (DCA), car
// un investissement unique n'est qu'un calendrier à un seul apport.
//
// La série de prix pilote la fenêtre effective : on ne peut pas acheter avant que
// le coin ait des données ni valoriser le portefeuille après le dernier jour
// disponible, donc le moteur borne la plage demandée à la plage de données et
// rapporte la fenêtre effective.
export function simulate(input: SimulationInput, prices: PricePoint[]): SimulationResult {
  const series = buildDenseSeries(prices);

  if (series === null) {
    return emptyResult(input, input.startDate, input.endDate);
  }

  const requestedStart = parseUTCDate(input.startDate);
  const requestedEnd = parseUTCDate(input.endDate);
  const dataStart = parseUTCDate(series.firstDate);
  const dataEnd = parseUTCDate(series.lastDate);

  const effStartDate = maxDate(requestedStart, dataStart);
  const effEndDate = minDate(requestedEnd, dataEnd);

  if (effStartDate.getTime() > effEndDate.getTime()) {
    return emptyResult(input, formatUTCDate(effStartDate), formatUTCDate(effEndDate));
  }

  const effectiveStart = formatUTCDate(effStartDate);
  const effectiveEnd = formatUTCDate(effEndDate);

  // Construire la liste des apports en valorisant chacun depuis la série dense.
  const scheduledDates = generateContributionDates(
    effectiveStart,
    effectiveEnd,
    input.frequency
  );

  const contributions: Contribution[] = [];
  for (const date of scheduledDates) {
    const price = series.priceAsOf(date);
    if (price === undefined || price <= 0) continue;
    contributions.push({
      date,
      amountInvested: input.amount,
      price,
      unitsBought: input.amount / price,
    });
  }

  // Indexer les apports par jour pour que la courbe les cumule en une seule passe.
  const unitsByDay = new Map<string, number>();
  const investedByDay = new Map<string, number>();
  for (const contribution of contributions) {
    unitsByDay.set(
      contribution.date,
      (unitsByDay.get(contribution.date) ?? 0) + contribution.unitsBought
    );
    investedByDay.set(
      contribution.date,
      (investedByDay.get(contribution.date) ?? 0) + contribution.amountInvested
    );
  }

  // Parcourir chaque jour de la fenêtre effective, en cumulant les unités et
  // l'argent entrant, et en valorisant le portefeuille au prix du jour.
  const timeline: TimelinePoint[] = [];
  let cumulativeUnits = 0;
  let cumulativeInvested = 0;
  let cursor = effStartDate;
  const dailyPrices: number[] = [];
  let lastPrice = 0;

  while (cursor.getTime() <= effEndDate.getTime()) {
    const iso = formatUTCDate(cursor);
    cumulativeUnits += unitsByDay.get(iso) ?? 0;
    cumulativeInvested += investedByDay.get(iso) ?? 0;

    const price = series.priceAsOf(iso);
    const value =
      price !== undefined
        ? cumulativeUnits * price
        : timeline.length > 0
          ? timeline[timeline.length - 1].value
          : 0;

    // Prix de l'actif au jour le jour (forward-fill des trous), pour la volatilité.
    lastPrice = price !== undefined ? price : lastPrice;
    dailyPrices.push(lastPrice);

    timeline.push({ date: iso, invested: cumulativeInvested, value });
    cursor = addDays(cursor, 1);
  }

  const totalInvested = cumulativeInvested;
  const totalUnits = cumulativeUnits;
  const finalPrice = series.priceAsOf(effectiveEnd) as number;
  const finalValue = totalUnits * finalPrice;
  const absoluteGain = finalValue - totalInvested;
  const percentageGain = totalInvested > 0 ? absoluteGain / totalInvested : 0;

  const metrics = computeMetrics({
    contributions,
    timeline,
    dailyPrices,
    totalInvested,
    totalUnits,
    finalValue,
    effectiveStartDate: effectiveStart,
    effectiveEndDate: effectiveEnd,
  });

  return {
    input,
    contributions,
    timeline,
    totalInvested,
    finalValue,
    finalPrice,
    totalUnits,
    absoluteGain,
    percentageGain,
    effectiveStartDate: effectiveStart,
    effectiveEndDate: effectiveEnd,
    metrics,
    hasData: true,
  };
}

// Construit un résultat à zéro pour le cas où aucune donnée exploitable n'existe
// sur la fenêtre.
function emptyResult(
  input: SimulationInput,
  effectiveStart: string,
  effectiveEnd: string
): SimulationResult {
  return {
    input,
    contributions: [],
    timeline: [],
    totalInvested: 0,
    finalValue: 0,
    finalPrice: 0,
    totalUnits: 0,
    absoluteGain: 0,
    percentageGain: 0,
    effectiveStartDate: effectiveStart,
    effectiveEndDate: effectiveEnd,
    metrics: {
      contributionCount: 0,
      averageBuyPrice: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      timeInProfit: 0,
      volatility: 0,
      peakValue: 0,
      peakDate: "",
    },
    hasData: false,
  };
}
