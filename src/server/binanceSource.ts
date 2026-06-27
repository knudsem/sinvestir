// Source de prix Binance, partagée entre la fonction serverless Vercel (production)
// et le middleware Vite (développement local). La logique réseau et la logique de
// transformation sont séparées : les fonctions pures (parsing, mapping de symbole,
// conversions de dates) sont testables sans réseau.

import type { PricePoint } from "../core/types.js";

// Endpoint public de données de marché. On essaie d'abord l'API principale, puis
// le miroir public binance.vision en repli (utile si l'une est indisponible).
const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];

const DAY_MS = 86_400_000;
const MAX_LIMIT = 1000; // Binance renvoie au plus 1000 bougies par requête.

interface KlineQuery {
  symbol: string;
  startTime: number;
  endTime: number;
}

// Pur : convertit un identifiant de coin et une devise en symbole Binance.
// Le dollar est représente par l'USDT, le stablecoin de référence du marché.
export function toBinanceSymbol(coinId: string, currency: string): string {
  const quote = currency.toLowerCase() === "usd" ? "USDT" : currency.toUpperCase();
  return `${coinId.toUpperCase()}${quote}`;
}

// Pur : date UTC "YYYY-MM-DD" vers millisecondes.
export function msFromIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Pur : millisecondes vers date UTC "YYYY-MM-DD".
export function isoFromMs(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Pur : transforme les lignes brutes de Binance en points de prix. Chaque bougie
// est un tableau dont l'index 0 est l'horodatage d'ouverture et l'index 4 le cours
// de clôture. On ignore toute ligne malformée plutôt que de propager une erreur.
export function parseKlines(rows: unknown): PricePoint[] {
  if (!Array.isArray(rows)) return [];
  const out: PricePoint[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const openTime = Number(row[0]);
    const close = Number(row[4]);
    if (!Number.isFinite(openTime) || !Number.isFinite(close)) continue;
    out.push({ date: isoFromMs(openTime), price: close });
  }
  return out;
}

// Pur : retire les doublons de date en gardant le dernier vu, et trie par date.
export function dedupeByDate(points: PricePoint[]): PricePoint[] {
  const byDate = new Map<string, number>();
  for (const p of points) byDate.set(p.date, p.price);
  return [...byDate.entries()]
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Réseau : récupère une URL en essayant chaque hôte à tour de rôle.
async function fetchJson(path: string): Promise<unknown> {
  let lastError: unknown = null;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        lastError = new Error(`Binance a répondu ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Source de prix injoignable");
}

// Réseau : récupère les bougies journalières sur toute la plage demandée, en
// paginant tant que Binance renvoie des pages pleines.
export async function fetchDailyKlines(query: KlineQuery): Promise<PricePoint[]> {
  const all: PricePoint[] = [];
  let cursor = query.startTime;

  while (cursor <= query.endTime) {
    const path =
      `/api/v3/klines?symbol=${encodeURIComponent(query.symbol)}` +
      `&interval=1d&startTime=${cursor}&endTime=${query.endTime}&limit=${MAX_LIMIT}`;
    const chunk = parseKlines(await fetchJson(path));
    if (chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < MAX_LIMIT) break;

    const lastMs = msFromIso(chunk[chunk.length - 1].date);
    const next = lastMs + DAY_MS;
    if (next <= cursor) break; // garde-fou contre une boucle infinie
    cursor = next;
  }

  return dedupeByDate(all);
}
