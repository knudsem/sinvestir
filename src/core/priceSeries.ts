import type { PricePoint } from "./types.js";
import { parseUTCDate, formatUTCDate, addDays } from "./dateUtils.js";

// Une série de prix journalière où chaque jour calendaire entre le premier et le
// dernier point de données possède un prix. Les trous dans les données source
// sont comblés en reportant le dernier prix connu, ce qui garde à la fois le prix
// des apports et la courbe stables même quand un jour manque dans le flux.
export interface DensePriceSeries {
  firstDate: string;
  lastDate: string;
  // Renvoie le prix pour un jour "YYYY-MM-DD" donné, ou undefined quand le jour
  // est en dehors de la plage couverte.
  priceAsOf(iso: string): number | undefined;
}

// Construit une série journalière dense à partir de points de prix bruts.
// Les prix invalides ou non positifs sont ignorés. Les jours en double gardent la
// dernière valeur. Renvoie null quand il n'y a aucune donnée exploitable.
export function buildDenseSeries(prices: PricePoint[]): DensePriceSeries | null {
  const sparse = new Map<string, number>();
  for (const point of prices) {
    if (Number.isFinite(point.price) && point.price > 0) {
      sparse.set(point.date, point.price);
    }
  }

  const sortedDays = [...sparse.keys()].sort();
  if (sortedDays.length === 0) return null;

  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];

  const dense = new Map<string, number>();
  let cursor = parseUTCDate(firstDay);
  const end = parseUTCDate(lastDay);
  let lastKnownPrice = sparse.get(firstDay) as number;

  while (cursor.getTime() <= end.getTime()) {
    const iso = formatUTCDate(cursor);
    const known = sparse.get(iso);
    if (known !== undefined) lastKnownPrice = known;
    dense.set(iso, lastKnownPrice);
    cursor = addDays(cursor, 1);
  }

  return {
    firstDate: firstDay,
    lastDate: lastDay,
    priceAsOf: (iso: string) => dense.get(iso),
  };
}
