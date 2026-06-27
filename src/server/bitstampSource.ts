// Source d'historique profond via l'API publique OHLC de Bitstamp. Bitstamp cote
// le BTC/USD depuis 2011, bien avant la cotation sur Binance (août 2017), ce qui
// permet de remonter beaucoup plus loin pour le Bitcoin. Comme pour Binance, la
// transformation pure (parsing) est isolée de la partie réseau pour être testable.

import type { PricePoint } from "../core/types.js";
import { isoFromMs } from "./binanceSource.js";

const HOST = "https://www.bitstamp.net";
const STEP_SECONDS = 86_400; // une bougie par jour
const MAX_LIMIT = 1000;

// Pur : extrait les bougies journalières de la réponse Bitstamp. La structure est
// { data: { ohlc: [{ timestamp, close, ... }] } }, avec l'horodatage en secondes.
export function parseBitstampOhlc(json: unknown): PricePoint[] {
  const root = json as { data?: { ohlc?: unknown } } | null;
  const rows = root?.data?.ohlc;
  if (!Array.isArray(rows)) return [];

  const out: PricePoint[] = [];
  for (const row of rows) {
    const seconds = Number((row as { timestamp?: unknown })?.timestamp);
    const close = Number((row as { close?: unknown })?.close);
    if (!Number.isFinite(seconds) || !Number.isFinite(close)) continue;
    out.push({ date: isoFromMs(seconds * 1000), price: close });
  }
  return out;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Bitstamp a répondu ${res.status}`);
  return res.json();
}

// Réseau : récupère les bougies journalières sur la plage demandée. On avance par
// fenêtres de taille fixe (exactement la limite de l'API). C'est volontaire :
// l'API OHLC de Bitstamp, quand on lui passe à la fois start et end, renvoie les
// dernières bougies avant end plutôt que de partir de start. En dimensionnant
// chaque fenêtre a exactement MAX_LIMIT jours, les deux interprétations donnent la
// même fenêtre, donc la collecte est correcte quel que soit ce comportement.
export async function fetchBitstampDaily(
  pair: string,
  startSeconds: number,
  endSeconds: number
): Promise<PricePoint[]> {
  const all: PricePoint[] = [];
  const windowSpan = (MAX_LIMIT - 1) * STEP_SECONDS;
  // Garde-fou : largement de quoi couvrir plus de quinze ans d'historique.
  const MAX_WINDOWS = 30;

  let cursor = startSeconds;
  for (let i = 0; i < MAX_WINDOWS && cursor <= endSeconds; i += 1) {
    const windowEnd = Math.min(cursor + windowSpan, endSeconds);
    const url =
      `${HOST}/api/v2/ohlc/${pair}/` +
      `?step=${STEP_SECONDS}&limit=${MAX_LIMIT}&start=${cursor}&end=${windowEnd}`;
    const chunk = parseBitstampOhlc(await fetchJson(url));
    all.push(...chunk);
    cursor = windowEnd + STEP_SECONDS;
  }

  return all;
}
