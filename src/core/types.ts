// Types du domaine pour le simulateur d'investissement crypto.
// Ces types sont indépendants de tout framework et ne contiennent aucune
// préoccupation d'interface ou de réseau.

// Fréquence des apports pendant la période simulée.
// "once" correspond à un investissement unique au départ (lump sum).
export type Frequency = "once" | "daily" | "weekly" | "monthly";

// Un prix de clôture journalier pour un coin, exprimé dans la devise cible.
// "date" est un jour calendaire en UTC, au format "YYYY-MM-DD".
export interface PricePoint {
  date: string;
  price: number;
}

// Une demande de simulation envoyée par l'utilisateur.
// "amount" est la somme investie par apport. Pour "once", c'est le montant unique.
export interface SimulationInput {
  coinId: string;
  currency: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
}

// Un apport réellement exécuté un jour donné.
export interface Contribution {
  date: string;
  amountInvested: number;
  price: number;
  unitsBought: number;
}

// Un point de la courbe journalière du portefeuille, utilisé pour le graphique.
// "invested" est le cumul de l'argent investi jusqu'à ce jour inclus.
// "value" est la valeur de marché du portefeuille ce jour-là.
export interface TimelinePoint {
  date: string;
  invested: number;
  value: number;
}

// Analyses dérivées calculées à partir d'une simulation.
export interface SimulationMetrics {
  // Nombre d'apports réellement exécutés.
  contributionCount: number;
  // Prix moyen payé par unité sur l'ensemble des apports (prix de revient).
  averageBuyPrice: number;
  // Rendement annualisé pondéré par les flux (XIRR), sous forme de ratio.
  // 0.2 signifie vingt pour cent par an. Pour un investissement unique, cela
  // équivaut au CAGR standard.
  annualizedReturn: number;
  // Pire baisse pic-à-creux de la valeur du portefeuille, sous forme de ratio
  // positif. 0.5 signifie que le portefeuille a perdu cinquante pour cent depuis
  // un pic antérieur, au pire moment.
  maxDrawdown: number;
  // Part des jours où le portefeuille valait au moins ce qui avait été investi.
  // 0.8 signifie que la position a passé quatre-vingts pour cent de la période
  // en profit.
  timeInProfit: number;
  // Volatilité annualisée des rendements journaliers de l'actif, sous forme de
  // ratio. 0.8 signifie quatre-vingts pour cent de volatilité annualisée, niveau
  // typique d'un actif crypto très agité.
  volatility: number;
  // Plus haute valeur de marché atteinte par le portefeuille sur la période.
  peakValue: number;
  // Date du sommet, au format "YYYY-MM-DD" (chaîne vide en l'absence de données).
  peakDate: string;
}

// Le résultat complet d'une simulation.
export interface SimulationResult {
  input: SimulationInput;
  contributions: Contribution[];
  timeline: TimelinePoint[];
  totalInvested: number;
  finalValue: number;
  // Le prix du coin à la date de fin effective, dans la devise cible.
  finalPrice: number;
  totalUnits: number;
  absoluteGain: number;
  // Gain sous forme de ratio. 0.5 signifie plus cinquante pour cent.
  percentageGain: number;
  // La plage réellement couverte par les données disponibles. Elle peut être plus
  // étroite que la plage demandée quand le coin n'a pas de données sur toute la
  // fenêtre demandée.
  effectiveStartDate: string;
  effectiveEndDate: string;
  // Analyses dérivées (rendement annualisé, prix moyen, drawdown, etc.).
  metrics: SimulationMetrics;
  // Vrai quand aucune donnée de prix exploitable n'a été trouvée sur la fenêtre.
  hasData: boolean;
}
