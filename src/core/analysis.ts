import type { Contribution } from "./types.js";

// Le résultat d'un apport unique, mesuré à la fin de la période.
export interface ContributionOutcome {
  date: string;
  amountInvested: number;
  unitsBought: number;
  // Valeur des unités issues de cet apport à la date de fin effective.
  valueAtEnd: number;
  // Rendement de cet apport seul, sous forme de ratio. 2 signifie un triplement.
  returnRatio: number;
}

export interface ContributionAnalysis {
  best: ContributionOutcome | null;
  worst: ContributionOutcome | null;
}

// Identifie le meilleur et le pire apport en termes de timing. Comme chaque apport
// est valorisé au même prix final, le meilleur achat est simplement celui réalisé
// au prix le plus bas et le pire celui réalisé au prix le plus haut. Les mettre en
// avant transforme un résultat abstrait en leçon concrète sur le timing ("ton
// meilleur achat était le creux de mars 2020"). Passez le prix de fin effectif
// issu du résultat de simulation.
export function analyzeContributions(
  contributions: Contribution[],
  finalPrice: number
): ContributionAnalysis {
  if (contributions.length === 0 || finalPrice <= 0) {
    return { best: null, worst: null };
  }

  let best: ContributionOutcome | null = null;
  let worst: ContributionOutcome | null = null;

  for (const contribution of contributions) {
    const valueAtEnd = contribution.unitsBought * finalPrice;
    const returnRatio =
      contribution.amountInvested > 0 ? valueAtEnd / contribution.amountInvested - 1 : 0;
    const outcome: ContributionOutcome = {
      date: contribution.date,
      amountInvested: contribution.amountInvested,
      unitsBought: contribution.unitsBought,
      valueAtEnd,
      returnRatio,
    };

    if (best === null || returnRatio > best.returnRatio) best = outcome;
    if (worst === null || returnRatio < worst.returnRatio) worst = outcome;
  }

  return { best, worst };
}
