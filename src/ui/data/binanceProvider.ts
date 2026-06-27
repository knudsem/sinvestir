import type { CoinSummary, PriceProvider, PricePoint } from "../../core/index.js";
import { COIN_CATALOG } from "./coinCatalog.js";

// Implémentation de PriceProvider qui passe par notre proxy (/api/klines). Le
// même code fonctionne en développement (middleware Vite) et en production
// (fonction serverless Vercel), car les deux exposent la même URL.

interface KlinesResponse {
  prices?: PricePoint[];
  error?: string;
}

export function createBinanceProvider(): PriceProvider {
  return {
    async listCoins(): Promise<CoinSummary[]> {
      return COIN_CATALOG.map(({ id, symbol, name }) => ({ id, symbol, name }));
    },

    async getDailyPrices(query: {
      coinId: string;
      currency: string;
      startDate: string;
      endDate: string;
    }): Promise<PricePoint[]> {
      const params = new URLSearchParams({
        coin: query.coinId,
        currency: query.currency,
        start: query.startDate,
        end: query.endDate,
      });
      const res = await fetch(`/api/klines?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Le proxy de prix a répondu ${res.status}`);
      }
      const data = (await res.json()) as KlinesResponse;
      return data.prices ?? [];
    },
  };
}
