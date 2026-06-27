import { parseUTCDate, formatUTCDate, addDays, addMonths } from "./dateUtils.js";

export type RangePresetId = "1m" | "3m" | "6m" | "1y" | "2y" | "5y" | "max";

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Ancre suffisamment loin dans le passé pour que le bornage des données du moteur
// décide du vrai début d'une plage "max" en fonction du premier jour disponible du
// coin.
const MAX_RANGE_ANCHOR = "2009-01-01";

// Construit une date de début et de fin pour une plage nommée, se terminant à la
// date de référence fournie. La date de référence est passée en paramètre plutôt
// que lue depuis une horloge, pour que le cœur reste pur et testable ; l'interface
// fournit la date du jour.
export function getPresetRange(preset: RangePresetId, referenceDate: string): DateRange {
  const end = parseUTCDate(referenceDate);

  if (preset === "max") {
    return { startDate: MAX_RANGE_ANCHOR, endDate: referenceDate };
  }

  const monthsBack: Record<Exclude<RangePresetId, "max">, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "1y": 12,
    "2y": 24,
    "5y": 60,
  };

  const start = addMonths(end, -monthsBack[preset]);
  return { startDate: formatUTCDate(start), endDate: referenceDate };
}

// Variante pratique qui utilise la veille de la date de référence comme fin sûre,
// quand un appelant veut éviter de demander le jour courant, possiblement incomplet.
export function getPresetRangeExcludingToday(
  preset: RangePresetId,
  referenceDate: string
): DateRange {
  const safeEnd = formatUTCDate(addDays(parseUTCDate(referenceDate), -1));
  return getPresetRange(preset, safeEnd);
}
