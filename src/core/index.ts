// Surface publique du cœur de simulation. L'interface n'importe que ce qui est
// exporte ici, ce qui garde les imports stables même si les fichiers internes
// sont réorganisés. Les utilitaires internes (dates, schedule, validation) ne
// sont pas réexportés : ils sont consommés directement par les modules du cœur
// et leurs tests.

export type {
  Frequency,
  PricePoint,
  SimulationInput,
  TimelinePoint,
  SimulationResult,
} from "./types.js";

export { simulate } from "./simulate.js";
export { compareStrategies } from "./compare.js";
export type { StrategyComparison } from "./compare.js";
export { compareToSavings } from "./benchmark.js";
export type { SavingsComparison } from "./benchmark.js";
export { adjustForInflation } from "./inflation.js";
export { analyzeContributions } from "./analysis.js";
export type { ContributionAnalysis } from "./analysis.js";
export { getPresetRange } from "./presets.js";
export type { RangePresetId } from "./presets.js";

export type { CoinSummary } from "./data/types.js";
export type { PriceProvider } from "./data/PriceProvider.js";
