import type { SimulationInput, SimulationResult, PricePoint } from "./types.js";
import { simulate } from "./simulate.js";

// Comparaison côte à côte de la stratégie récurrente choisie face au déploiement
// du même capital total en un seul investissement au début de la période.
export interface StrategyComparison {
  // La stratégie de l'utilisateur telle que saisie (récurrente, ou un seul achat
  // quand "once").
  scheduled: SimulationResult;
  // Le même capital total investi en une seule fois le jour de début effectif.
  lumpSum: SimulationResult;
  // Différence de valeur finale, stratégie choisie moins investissement unique.
  difference: number;
  // Quelle approche finit devant. "tie" quand elles sont à distance d'arrondi.
  winner: "scheduled" | "lumpSum" | "tie";
}

// "Vaut-il mieux investir progressivement ou tout d'un coup ?" est la question la
// plus fréquente que se pose un épargnant, donc le moteur y répond directement.
// L'investissement unique déploie exactement l'argent que le plan récurrent a
// réellement investi, seule base de comparaison équitable. La comparaison réutilise
// le moteur de simulation, donc aucune logique financière n'est dupliquée.
export function compareStrategies(
  input: SimulationInput,
  prices: PricePoint[]
): StrategyComparison {
  const scheduled = simulate(input, prices);

  // Déployer le capital réellement investi par le plan récurrent, en une seule
  // fois, le même jour de début effectif. Ancrer sur le début effectif garde les
  // deux simulations sur une fenêtre identique même quand le bornage des données
  // a décalé le début.
  const lumpInput: SimulationInput = {
    ...input,
    frequency: "once",
    amount: scheduled.totalInvested,
    startDate: scheduled.effectiveStartDate,
  };
  const lumpSum = simulate(lumpInput, prices);

  const difference = scheduled.finalValue - lumpSum.finalValue;
  const epsilon = 1e-6;
  const winner =
    Math.abs(difference) <= epsilon ? "tie" : difference > 0 ? "scheduled" : "lumpSum";

  return { scheduled, lumpSum, difference, winner };
}
