import type { PricePoint } from "../types.js";
import type { CoinSummary } from "./types.js";
import type { PriceProvider } from "./PriceProvider.js";

export interface FixtureData {
  coins: CoinSummary[];
  // Indexé par `${coinId}:${currency}`, par exemple "BTC:usd".
  prices: Record<string, PricePoint[]>;
}

// Un provider adossé à des données en mémoire. Il permet à l'interface et aux
// tests de tourner sur un jeu de données déterministe avant que le vrai provider
// réseau soit branché, et garde le reste de l'application honnête en ne dépendant
// que de l'interface PriceProvider.
export function createFixtureProvider(data: FixtureData): PriceProvider {
  return {
    async listCoins(): Promise<CoinSummary[]> {
      return data.coins;
    },

    async getDailyPrices({ coinId, currency, startDate, endDate }): Promise<PricePoint[]> {
      const key = `${coinId}:${currency}`;
      const series = data.prices[key] ?? [];
      // Les chaînes "YYYY-MM-DD" se comparent correctement par ordre lexicographique.
      return series.filter((point) => point.date >= startDate && point.date <= endDate);
    },
  };
}
