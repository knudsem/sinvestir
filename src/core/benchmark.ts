import type { Contribution } from "./types.js";
import { parseUTCDate } from "./dateUtils.js";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

// Comparaison entre la stratégie crypto et un placement sécurisé de référence
// (type Livret A). Le même calendrier d'apports est rejoué sur un livret composé,
// pour répondre à la question qu'un épargnant se pose vraiment : est-ce que la
// prise de risque en valait la peine par rapport à une épargne sans risque ?
export interface SavingsComparison {
  // Taux annuel utilisé pour le placement sécurisé (0.03 pour trois pour cent).
  rate: number;
  // Valeur finale de la stratégie crypto.
  cryptoValue: number;
  // Valeur finale si les mêmes apports avaient alimenté le livret.
  savingsValue: number;
  // Capital total versé, identique dans les deux cas.
  totalInvested: number;
  // Écart crypto moins livret. Positif si la crypto a fait mieux.
  difference: number;
}

// Valeur finale si chaque apport avait été placé sur un livret à taux fixe,
// composé quotidiennement, jusqu'à la date de fin. Calcul pur, sans réseau.
export function compareToSavings(
  contributions: Contribution[],
  cryptoFinalValue: number,
  effectiveEndDate: string,
  annualRate: number
): SavingsComparison {
  const endMs = parseUTCDate(effectiveEndDate).getTime();
  let savingsValue = 0;
  let totalInvested = 0;

  for (const contribution of contributions) {
    totalInvested += contribution.amountInvested;
    const years = Math.max(
      0,
      (endMs - parseUTCDate(contribution.date).getTime()) / (MS_PER_DAY * DAYS_PER_YEAR)
    );
    savingsValue += contribution.amountInvested * Math.pow(1 + annualRate, years);
  }

  return {
    rate: annualRate,
    cryptoValue: cryptoFinalValue,
    savingsValue,
    totalInvested,
    difference: cryptoFinalValue - savingsValue,
  };
}
