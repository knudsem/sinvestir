import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  simulate,
  compareStrategies,
  analyzeContributions,
  compareToSavings,
} from "../../core/index.js";
import type {
  PriceProvider,
  PricePoint,
  SimulationInput,
  SimulationResult,
  StrategyComparison,
  ContributionAnalysis,
  SavingsComparison,
} from "../../core/index.js";

// Taux de référence d'un placement sécurisé (type Livret A) pour la comparaison
// risque / rendement. Centralisé ici pour être ajusté facilement.
const SAVINGS_RATE = 0.03;

interface SimulationOutput {
  result: SimulationResult | null;
  comparison: StrategyComparison | null;
  analysis: ContributionAnalysis | null;
  savings: SavingsComparison | null;
  loading: boolean;
  error: boolean;
}

// Charge la série de prix d'un coin via le provider (une seule fois par coin,
// mise en cache), puis recalcule la simulation de manière synchrone à chaque
// changement d'entrée. Le moteur étant pur, seules les données demandent du
// réseau ; tout le reste est instantané. La plage chargée couvre tout l'historique
// du coin, et le moteur borne ensuite la simulation à la période demandée.
export function useSimulation(
  provider: PriceProvider,
  input: SimulationInput,
  fetchRange: { start: string; end: string }
): SimulationOutput {
  const cache = useRef<Map<string, PricePoint[]>>(new Map());
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const coinId = input.coinId;

    const cached = cache.current.get(coinId);
    if (cached) {
      setPrices(cached);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    provider
      .getDailyPrices({
        coinId,
        currency: input.currency,
        startDate: fetchRange.start,
        endDate: fetchRange.end,
      })
      .then((series) => {
        if (cancelled) return;
        cache.current.set(coinId, series);
        setPrices(series);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPrices([]);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider, input.coinId, input.currency, fetchRange.start, fetchRange.end]);

  const result = useMemo(
    () => (prices.length > 0 ? simulate(input, prices) : null),
    [prices, input.coinId, input.amount, input.frequency, input.startDate, input.endDate]
  );

  const comparison = useMemo(
    () => (prices.length > 0 ? compareStrategies(input, prices) : null),
    [prices, input.coinId, input.amount, input.frequency, input.startDate, input.endDate]
  );

  const analysis = useMemo(
    () => (result ? analyzeContributions(result.contributions, result.finalPrice) : null),
    [result]
  );

  const savings = useMemo(
    () =>
      result
        ? compareToSavings(
            result.contributions,
            result.finalValue,
            result.effectiveEndDate,
            SAVINGS_RATE
          )
        : null,
    [result]
  );

  return { result, comparison, analysis, savings, loading, error };
}
