import { describe, it, expect } from "vitest";
import { createFixtureProvider } from "../data/fixtureProvider.js";

describe("createFixtureProvider", () => {
  const provider = createFixtureProvider({
    coins: [{ id: "BTC", symbol: "BTC", name: "Bitcoin" }],
    prices: {
      "BTC:usd": [
        { date: "2021-01-01", price: 100 },
        { date: "2021-01-02", price: 110 },
        { date: "2021-01-03", price: 120 },
      ],
    },
  });

  it("liste les coins configurés", async () => {
    const coins = await provider.listCoins();
    expect(coins).toHaveLength(1);
    expect(coins[0].symbol).toBe("BTC");
  });

  it("ne renvoie que les prix à l'intérieur de la fenêtre demandée", async () => {
    const prices = await provider.getDailyPrices({
      coinId: "BTC",
      currency: "usd",
      startDate: "2021-01-02",
      endDate: "2021-01-03",
    });
    expect(prices.map((p) => p.date)).toEqual(["2021-01-02", "2021-01-03"]);
  });

  it("renvoie une liste vide pour un coin inconnu", async () => {
    const prices = await provider.getDailyPrices({
      coinId: "DOGE",
      currency: "usd",
      startDate: "2021-01-01",
      endDate: "2021-01-03",
    });
    expect(prices).toEqual([]);
  });
});
