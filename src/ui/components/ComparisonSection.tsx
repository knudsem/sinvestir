import { useState } from "preact/hooks";
import type { PriceProvider, SimulationInput } from "../../core/index.js";
import { COIN_CATALOG, catalogCoin } from "../data/coinCatalog.js";
import { useComparison } from "../hooks/useComparison.js";
import { ComparisonChart } from "./ComparisonChart.js";
import type { ComparisonSeries } from "./ComparisonChart.js";
import { formatMoney, formatPercent } from "../format.js";

const COLORS = ["#1098f8", "#f8d046", "#b98cf2", "#4fd1c5"];
const MAX_COINS = 4;

interface Props {
  provider: PriceProvider;
  base: Omit<SimulationInput, "coinId">;
}

// Section de comparaison : on choisit jusqu'à quatre cryptos et on visualise sur
// un même graphique ce qu'aurait donné la même stratégie sur chacune.
export function ComparisonSection({ provider, base }: Props) {
  const [selected, setSelected] = useState<string[]>(["BTC", "ETH", "SOL"]);
  const { results, loading } = useComparison(provider, selected, base);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COINS) return prev;
      return [...prev, id];
    });
  };

  const colorOf = (id: string) => COLORS[Math.max(0, selected.indexOf(id)) % COLORS.length];
  const series: ComparisonSeries[] = results.map((r) => ({
    coinId: r.coinId,
    name: catalogCoin(r.coinId)?.name ?? r.coinId,
    color: colorOf(r.coinId),
    points: r.result.timeline,
  }));

  return (
    <div class="card card-pad compare-section">
      <h3 class="compare-title">Comparer plusieurs cryptos</h3>
      <p class="cmp-sub">Mêmes apports, mêmes dates, jusqu'à {MAX_COINS} cryptos à la fois.</p>
      <div class="cmp-picker">
        {COIN_CATALOG.map((c) => (
          <button
            type="button"
            class={`chip ${selected.includes(c.id) ? "active" : ""}`}
            onClick={() => toggle(c.id)}
          >
            {c.symbol}
          </button>
        ))}
      </div>

      {loading && results.length === 0 ? (
        <p class="hint">Chargement des données...</p>
      ) : (
        <>
          <ComparisonChart series={series} />
          <div class="cmp-legend">
            {results.map((r) => (
              <div class="cmp-row">
                <span class="cmp-name">
                  <i class="cmp-swatch" style={`background:${colorOf(r.coinId)}`}></i>
                  {catalogCoin(r.coinId)?.name ?? r.coinId}
                </span>
                <span class="cmp-val tnum">{formatMoney(r.result.finalValue)}</span>
                <span class={`cmp-pct tnum ${r.result.percentageGain >= 0 ? "pos" : "neg"}`}>
                  {formatPercent(r.result.percentageGain)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
