import type { Frequency } from "./types.js";
import { parseUTCDate, formatUTCDate, addDays, addMonths } from "./dateUtils.js";

// Génère la liste des dates d'apport entre le début et la fin inclus, selon la
// fréquence choisie. Toutes les dates sont des chaînes "YYYY-MM-DD".
//
// Règles :
// - "once" : un seul apport à la date de début.
// - "daily" : chaque jour calendaire.
// - "weekly" : tous les sept jours à partir de la date de début.
// - "monthly" : le même jour du mois que la date de début, borné au dernier jour
//   des mois plus courts. L'ancre est toujours recalculée depuis la date de début
//   d'origine afin, par exemple, qu'un départ le 31 retombe sur le 31 dès que le
//   mois le permet, plutôt que de dériver vers le début après un bornage.
export function generateContributionDates(
  startDate: string,
  endDate: string,
  frequency: Frequency
): string[] {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (start.getTime() > end.getTime()) return [];

  if (frequency === "once") {
    return [startDate];
  }

  const dates: string[] = [];

  if (frequency === "monthly") {
    let monthOffset = 0;
    while (true) {
      const next = addMonths(start, monthOffset);
      if (next.getTime() > end.getTime()) break;
      dates.push(formatUTCDate(next));
      monthOffset += 1;
    }
    return dates;
  }

  const stepDays = frequency === "daily" ? 1 : 7;
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatUTCDate(cursor));
    cursor = addDays(cursor, stepDays);
  }
  return dates;
}
