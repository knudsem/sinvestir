// Orchestration des sources de prix. Pour le Bitcoin, l'historique avant la
// cotation Binance (août 2017) est complétée par Bitstamp (données depuis 2011),
// puis les deux séries sont fusionnées. Pour les autres actifs, on utilise Binance
// seul. C'est l'unique point qui connait les sources ; le reste de l'application
// n'en sait rien et passe toujours par la même URL de proxy.

import type { PricePoint } from "../core/types.js";
import { fetchDailyKlines, toBinanceSymbol, dedupeByDate } from "./binanceSource.js";
import { fetchBitstampDaily } from "./bitstampSource.js";

const MS_PER_DAY = 86_400_000;
// Date de cotation du BTC/USDT sur Binance ; avant cela, on passe par Bitstamp.
const BINANCE_BTC_START_MS = Date.UTC(2017, 7, 17);

interface PriceRequest {
  coinId: string;
  currency: string;
  startMs: number;
  endMs: number;
}

function hasDeepHistory(coinId: string, currency: string): boolean {
  return coinId.toUpperCase() === "BTC" && currency.toLowerCase() === "usd";
}

async function fetchCombined(req: PriceRequest): Promise<PricePoint[]> {
  const symbol = toBinanceSymbol(req.coinId, req.currency);
  const binanceStart = Math.max(req.startMs, BINANCE_BTC_START_MS);
  const binance = await fetchDailyKlines({
    symbol,
    startTime: binanceStart,
    endTime: req.endMs,
  });

  if (hasDeepHistory(req.coinId, req.currency) && req.startMs < BINANCE_BTC_START_MS) {
    try {
      const early = await fetchBitstampDaily(
        "btcusd",
        Math.floor(req.startMs / 1000),
        Math.floor((BINANCE_BTC_START_MS - MS_PER_DAY) / 1000)
      );
      // Binance place en dernier l'emporte sur les dates en chevauchement.
      return dedupeByDate([...early, ...binance]);
    } catch {
      // Source d'historique profond indisponible : on continue avec Binance seul.
      return binance;
    }
  }

  return binance;
}

interface CacheEntry {
  expires: number;
  data: PricePoint[];
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;

export async function getDailyPrices(req: PriceRequest): Promise<PricePoint[]> {
  const key = `${req.coinId}:${req.currency}:${req.startMs}:${req.endMs}`;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.data;

  const data = await fetchCombined(req);
  cache.set(key, { data, expires: now + TTL_MS });
  return data;
}
