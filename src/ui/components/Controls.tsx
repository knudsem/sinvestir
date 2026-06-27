import type { CoinSummary, Frequency, RangePresetId } from "../../core/index.js";

export interface ControlsState {
  coinId: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  activePreset: RangePresetId | null;
}

interface Props {
  coins: CoinSummary[];
  state: ControlsState;
  onChange: (patch: Partial<ControlsState>) => void;
  onPreset: (preset: RangePresetId) => void;
}

const FREQUENCIES: Array<{ id: Frequency; label: string }> = [
  { id: "once", label: "Une fois" },
  { id: "daily", label: "Quotidien" },
  { id: "weekly", label: "Hebdo" },
  { id: "monthly", label: "Mensuel" },
];

const PRESETS: Array<{ id: RangePresetId; label: string }> = [
  { id: "1y", label: "1A" },
  { id: "2y", label: "2A" },
  { id: "5y", label: "5A" },
  { id: "max", label: "Max" },
];

export function Controls({ coins, state, onChange, onPreset }: Props) {
  return (
    <div class="card card-pad controls-card">
      <div class="field">
        <label class="label" for="coin">Cryptomonnaie</label>
        <select
          id="coin"
          class="select"
          value={state.coinId}
          onChange={(e) => onChange({ coinId: (e.currentTarget as HTMLSelectElement).value })}
        >
          {coins.map((coin) => (
            <option value={coin.id}>
              {coin.name} ({coin.symbol})
            </option>
          ))}
        </select>
      </div>

      <div class="field">
        <label class="label" for="amount">
          {state.frequency === "once" ? "Montant investi" : "Montant par apport"}
        </label>
        <div class="input-prefix">
          <span class="sign">$</span>
          <input
            id="amount"
            class="input tnum"
            type="number"
            min="1"
            step="10"
            value={state.amount}
            onInput={(e) => {
              const v = Number((e.currentTarget as HTMLInputElement).value);
              onChange({ amount: Number.isFinite(v) ? v : 0 });
            }}
          />
        </div>
      </div>

      <div class="field">
        <span class="label">Fréquence</span>
        <div class="segmented" role="group" aria-label="Fréquence">
          {FREQUENCIES.map((f) => (
            <button
              type="button"
              class={f.id === state.frequency ? "active" : ""}
              aria-pressed={f.id === state.frequency}
              onClick={() => onChange({ frequency: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div class="field">
        <span class="label">Période</span>
        <div class="presets">
          {PRESETS.map((p) => (
            <button
              type="button"
              class={`chip ${p.id === state.activePreset ? "active" : ""}`}
              onClick={() => onPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div class="date-row">
          <input
            class="input tnum"
            type="date"
            aria-label="Date de début"
            value={state.startDate}
            onInput={(e) =>
              onChange({
                startDate: (e.currentTarget as HTMLInputElement).value,
                activePreset: null,
              })
            }
          />
          <input
            class="input tnum"
            type="date"
            aria-label="Date de fin"
            value={state.endDate}
            onInput={(e) =>
              onChange({
                endDate: (e.currentTarget as HTMLInputElement).value,
                activePreset: null,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
