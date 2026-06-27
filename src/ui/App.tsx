import { useEffect, useMemo, useState } from "preact/hooks";
import { getPresetRange } from "../core/index.js";
import type { CoinSummary, Frequency, RangePresetId, SimulationInput } from "../core/index.js";
import { Controls } from "./components/Controls.js";
import type { ControlsState } from "./components/Controls.js";
import { Results } from "./components/Results.js";
import { ComparisonSection } from "./components/ComparisonSection.js";
import { useSimulation } from "./hooks/useSimulation.js";
import { createBinanceProvider } from "./data/binanceProvider.js";
import { COIN_CATALOG, catalogCoin, inceptionOf } from "./data/coinCatalog.js";
import { readStateFromUrl, writeStateToUrl, buildShareUrl } from "./urlState.js";
import { exportSimulationPdf } from "./pdf/exportPdf.js";

// Date du jour en UTC, référence pour les presets de période.
const TODAY = new Date().toISOString().slice(0, 10);

const COINS: CoinSummary[] = COIN_CATALOG.map(({ id, symbol, name }) => ({ id, symbol, name }));

// Plage d'un preset pour un actif donné, bornée à sa date de cotation au plus tôt
// et à aujourd'hui au plus tard.
function rangeForPreset(preset: RangePresetId, coinId: string): { startDate: string; endDate: string } {
  const since = inceptionOf(coinId);
  if (preset === "max") return { startDate: since, endDate: TODAY };
  const range = getPresetRange(preset, TODAY);
  return {
    startDate: range.startDate < since ? since : range.startDate,
    endDate: range.endDate > TODAY ? TODAY : range.endDate,
  };
}

function buildInitialState(): ControlsState {
  const fromUrl = readStateFromUrl();
  const coinId = fromUrl.coinId ?? "BTC";
  const base = rangeForPreset("max", coinId);
  return {
    coinId,
    amount: fromUrl.amount ?? 100,
    frequency: (fromUrl.frequency as Frequency) ?? "monthly",
    startDate: fromUrl.startDate ?? base.startDate,
    endDate: fromUrl.endDate ?? base.endDate,
    activePreset: fromUrl.startDate ? null : "max",
  };
}

export function App() {
  const provider = useMemo(() => createBinanceProvider(), []);
  const [state, setState] = useState<ControlsState>(buildInitialState);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const input: SimulationInput = useMemo(
    () => ({
      coinId: state.coinId,
      currency: "usd",
      amount: state.amount,
      frequency: state.frequency,
      startDate: state.startDate,
      endDate: state.endDate,
    }),
    [state]
  );

  const fetchRange = useMemo(
    () => ({ start: inceptionOf(state.coinId), end: TODAY }),
    [state.coinId]
  );

  const { result, comparison, analysis, savings, loading, error } = useSimulation(
    provider,
    input,
    fetchRange
  );

  useEffect(() => {
    writeStateToUrl(input);
  }, [input]);

  const handleChange = (patch: Partial<ControlsState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      // Au changement d'actif, on recadre les dates pour rester dans son historique.
      if (patch.coinId && patch.coinId !== prev.coinId) {
        if (next.activePreset) {
          const range = rangeForPreset(next.activePreset, patch.coinId);
          next.startDate = range.startDate;
          next.endDate = range.endDate;
        } else {
          const since = inceptionOf(patch.coinId);
          if (next.startDate < since) next.startDate = since;
          if (next.endDate > TODAY) next.endDate = TODAY;
        }
      }
      return next;
    });
  };

  const handlePreset = (preset: RangePresetId) => {
    setState((prev) => ({ ...prev, ...rangeForPreset(preset, prev.coinId), activePreset: preset }));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(input));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleExport = async () => {
    if (!result || !comparison || !savings) return;
    setExporting(true);
    try {
      await exportSimulationPdf(result, comparison, savings, coin?.name ?? state.coinId);
    } finally {
      setExporting(false);
    }
  };

  const coin = catalogCoin(state.coinId);

  return (
    <div class="page">
      <header class="masthead">
        <img src="/logo-sinvestir-full.svg" alt="S'investir Simulateurs" class="brand-logo" width="301" height="60" />
        <a class="discover-link" href="https://www.sinvestir.fr" target="_blank" rel="noopener">
          Découvrir S'investir
        </a>
      </header>
      <h1 class="headline">Simulateur crypto</h1>
      <p class="tagline">
        Et si vous aviez investi ? Visualisez ce que votre stratégie aurait vraiment donné.
      </p>
      <p class="subhead">
        Choisissez une crypto, un montant et une période, du versement programmé (DCA)
        au placement unique.
      </p>

      <div class="layout">
        <Controls coins={COINS} state={state} onChange={handleChange} onPreset={handlePreset} />

        <div>
          {error ? (
            <div class="card card-pad">
              <p class="hint">
                Impossible de charger les prix en direct pour le moment. Vérifiez
                votre connexion et réessayez dans un instant.
              </p>
            </div>
          ) : result && comparison && analysis && savings ? (
            <Results
              result={result}
              comparison={comparison}
              analysis={analysis}
              savings={savings}
              coin={coin}
            />
          ) : (
            <div class="card card-pad">
              <p class="hint">{loading ? "Chargement des prix en direct..." : "Aucune donnée."}</p>
            </div>
          )}
          <div class="toolbar">
            {result && comparison && savings && (
              <button type="button" class="ghost-btn" onClick={handleExport} disabled={exporting}>
                {exporting ? "Export en cours..." : "Exporter en PDF"}
              </button>
            )}
            <button type="button" class="ghost-btn" onClick={handleShare}>
              {copied ? "Lien copie" : "Copier le lien de cette simulation"}
            </button>
          </div>
        </div>
      </div>

      <ComparisonSection
        provider={provider}
        base={{
          currency: input.currency,
          amount: input.amount,
          frequency: input.frequency,
          startDate: input.startDate,
          endDate: input.endDate,
        }}
      />

      <p class="footnote">
        Prix de clôture journaliers via Binance. Simulation à but pédagogique, ceci
        n'est pas un conseil en investissement.
      </p>
    </div>
  );
}
