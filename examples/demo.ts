// Petite démo exécutable du cœur de simulation. Elle construit une série de prix
// synthétique déterministe (aucun réseau requis), lance un DCA mensuel, le compare
// à un investissement unique, et affiche les meilleurs et pires achats en termes
// de timing. À lancer avec : npm run demo

import { simulate } from "../src/core/simulate.js";
import { compareStrategies } from "../src/core/compare.js";
import { analyzeContributions } from "../src/core/analysis.js";
import { formatUTCDate, parseUTCDate, addDays } from "../src/core/dateUtils.js";
import type { PricePoint, SimulationInput } from "../src/core/types.js";

// Construit deux ans de prix journaliers suivant une tendance douce plus une
// oscillation, pour que la trajectoire ait des creux et des reprises et rende la
// comparaison intéressante.
function buildSyntheticSeries(startDate: string, days: number): PricePoint[] {
  const series: PricePoint[] = [];
  let cursor = parseUTCDate(startDate);
  for (let i = 0; i < days; i++) {
    const trend = 100 + i * 0.15;
    const wave = 40 * Math.sin(i / 45);
    const price = Math.max(5, trend + wave);
    series.push({ date: formatUTCDate(cursor), price: Number(price.toFixed(2)) });
    cursor = addDays(cursor, 1);
  }
  return series;
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function money(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

const prices = buildSyntheticSeries("2022-01-01", 730);

const input: SimulationInput = {
  coinId: "DEMO",
  currency: "usd",
  amount: 100,
  frequency: "monthly",
  startDate: "2022-01-01",
  endDate: "2023-12-31",
};

const result = simulate(input, prices);

console.log("=== DCA mensuel de 100 sur deux ans ===");
console.log(`Fenêtre :            ${result.effectiveStartDate} a ${result.effectiveEndDate}`);
console.log(`Apports :            ${result.metrics.contributionCount}`);
console.log(`Total investi :      ${money(result.totalInvested)}`);
console.log(`Valeur finale :      ${money(result.finalValue)}`);
console.log(`Gain total :         ${money(result.absoluteGain)} (${pct(result.percentageGain)})`);
console.log(`Annualise (XIRR) :   ${pct(result.metrics.annualizedReturn)}`);
console.log(`Prix d'achat moyen : ${money(result.metrics.averageBuyPrice)}`);
console.log(`Drawdown max :        ${pct(result.metrics.maxDrawdown)}`);
console.log(`Temps en profit :    ${pct(result.metrics.timeInProfit)}`);

const comparison = compareStrategies(input, prices);
console.log("");
console.log("=== DCA contre investissement unique (même capital) ===");
console.log(`Valeur finale DCA :    ${money(comparison.scheduled.finalValue)}`);
console.log(`Valeur finale unique : ${money(comparison.lumpSum.finalValue)}`);
console.log(`Difference :           ${money(comparison.difference)}`);
console.log(`Gagnant :              ${comparison.winner}`);

const outcomes = analyzeContributions(result.contributions, result.finalPrice);
console.log("");
console.log("=== Meilleur et pire achat ===");
if (outcomes.best && outcomes.worst) {
  console.log(`Meilleur achat : ${outcomes.best.date} a ${pct(outcomes.best.returnRatio)}`);
  console.log(`Pire achat :     ${outcomes.worst.date} a ${pct(outcomes.worst.returnRatio)}`);
}
