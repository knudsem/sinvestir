import type { SimulationInput } from "../core/index.js";

// Lecture et écriture de l'état du simulateur dans l'URL, pour que chaque
// simulation soit partageable par simple copie du lien. C'est une fonctionnalité
// produit à faible coût qui génère aussi du trafic organique.

const KEYS = ["coin", "amount", "freq", "start", "end"] as const;

export function readStateFromUrl(): Partial<SimulationInput> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Partial<SimulationInput> = {};

  const coin = params.get("coin");
  if (coin) out.coinId = coin.toUpperCase();

  const amount = params.get("amount");
  if (amount && Number.isFinite(Number(amount))) out.amount = Number(amount);

  const freq = params.get("freq");
  if (freq === "once" || freq === "daily" || freq === "weekly" || freq === "monthly") {
    out.frequency = freq;
  }

  const start = params.get("start");
  if (start) out.startDate = start;

  const end = params.get("end");
  if (end) out.endDate = end;

  return out;
}

export function writeStateToUrl(input: SimulationInput): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("coin", input.coinId);
  params.set("amount", String(input.amount));
  params.set("freq", input.frequency);
  params.set("start", input.startDate);
  params.set("end", input.endDate);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}

// Construit un lien absolu partageable à partir d'une entrée.
export function buildShareUrl(input: SimulationInput): string {
  const params = new URLSearchParams({
    coin: input.coinId,
    amount: String(input.amount),
    freq: input.frequency,
    start: input.startDate,
    end: input.endDate,
  });
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";
  return `${base}?${params.toString()}`;
}

export { KEYS };
