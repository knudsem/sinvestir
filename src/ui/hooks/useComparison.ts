import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { simulate } from "../../core/index.js";
import type {
  PriceProvider,
  PricePoint,
  SimulationInput,
  SimulationResult,
} from "../../core/index.js";
import { inceptionOf } from "../data/coinCatalog.js";

const TODAY = new Date().toISOString().slice(0, 10);

export interface ComparisonResult {
  coinId: string;
  result: SimulationResult;
}

// Charge et simule plusieurs cryptos avec les mêmes paramètres, pour les comparer
// sur un même graphique. Chaque série est mise en cache par coin, et le moteur
// (pur) recalcule à la volée quand les paramètres changent.
export function useComparison(
  provider: PriceProvider,
  coinIds: string[],
  base: Omit<SimulationInput, "coinId">
): { results: ComparisonResult[]; loading: boolean } {
  const cache = useRef<Map<string, PricePoint[]>>(new Map());
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);

  const key = coinIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const missing = coinIds.filter((id) => !cache.current.has(id));
    if (missing.length === 0) return;

    setLoading(true);
    Promise.all(
      missing.map((id) =>
        provider
          .getDailyPrices({
            coinId: id,
            currency: base.currency,
            startDate: inceptionOf(id),
            endDate: TODAY,
          })
          .then((series) => {
            cache.current.set(id, series);
          })
          .catch(() => {
            cache.current.set(id, []);
          })
      )
    ).then(() => {
      if (cancelled) return;
      setVersion((v) => v + 1);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [provider, key, base.currency]);

  const results = useMemo(() => {
    const out: ComparisonResult[] = [];
    for (const id of coinIds) {
      const series = cache.current.get(id);
      if (series && series.length > 0) {
        out.push({ coinId: id, result: simulate({ ...base, coinId: id }, series) });
      }
    }
    return out;
    // version force le recalcul une fois les données chargées.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version, base.currency, base.amount, base.frequency, base.startDate, base.endDate]);

  return { results, loading };
}
