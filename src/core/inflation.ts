import { parseUTCDate } from "./dateUtils.js";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

// Ajustement de l'inflation. Un rendement nominal flatteur peut cacher une perte
// de pouvoir d'achat ; cette fonction traduit la valeur finale en euros de l'année
// de départ et calcule le rendement réel, une fois l'inflation retirée.
export interface InflationAdjustment {
  rate: number;
  // Valeur finale exprimée en pouvoir d'achat de la date de départ.
  realValue: number;
  // Rendement annualisé réel (nominal corrigé de l'inflation), sous forme de ratio.
  realAnnualReturn: number;
}

export function adjustForInflation(
  finalValue: number,
  nominalAnnualReturn: number,
  effectiveStartDate: string,
  effectiveEndDate: string,
  annualInflationRate: number
): InflationAdjustment {
  const startMs = parseUTCDate(effectiveStartDate).getTime();
  const endMs = parseUTCDate(effectiveEndDate).getTime();
  const years = Math.max(0, (endMs - startMs) / (MS_PER_DAY * DAYS_PER_YEAR));

  const realValue = finalValue / Math.pow(1 + annualInflationRate, years);
  const realAnnualReturn = (1 + nominalAnnualReturn) / (1 + annualInflationRate) - 1;

  return { rate: annualInflationRate, realValue, realAnnualReturn };
}
