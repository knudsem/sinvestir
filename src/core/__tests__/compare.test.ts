import { describe, it, expect } from "vitest";
import { compareStrategies } from "../compare.js";
import type { PricePoint, SimulationInput } from "../types.js";

function input(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    coinId: "TEST",
    currency: "usd",
    amount: 100,
    frequency: "daily",
    startDate: "2021-01-01",
    endDate: "2021-01-05",
    ...overrides,
  };
}

describe("compareStrategies", () => {
  it("investit le même capital total dans les deux stratégies", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 110 },
      { date: "2021-01-03", price: 120 },
      { date: "2021-01-04", price: 130 },
      { date: "2021-01-05", price: 140 },
    ];
    const comparison = compareStrategies(input({ amount: 100, frequency: "daily" }), prices);
    expect(comparison.scheduled.totalInvested).toBeCloseTo(500, 10);
    expect(comparison.lumpSum.totalInvested).toBeCloseTo(500, 10);
  });

  it("l'investissement unique gagne dans un marché en hausse régulière", () => {
    // Les prix ne font que monter, acheter tôt bat donc l'étalement à prix plus haut.
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 110 },
      { date: "2021-01-03", price: 120 },
      { date: "2021-01-04", price: 130 },
      { date: "2021-01-05", price: 140 },
    ];
    const comparison = compareStrategies(input({ amount: 100, frequency: "daily" }), prices);
    expect(comparison.lumpSum.finalValue).toBeGreaterThan(comparison.scheduled.finalValue);
    expect(comparison.winner).toBe("lumpSum");
  });

  it("le DCA gagne dans un creux qui se rétablit", () => {
    // Le prix baisse puis remonte au-dessus du départ, l'étalement achète moins cher.
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 60 },
      { date: "2021-01-03", price: 50 },
      { date: "2021-01-04", price: 80 },
      { date: "2021-01-05", price: 120 },
    ];
    const comparison = compareStrategies(input({ amount: 100, frequency: "daily" }), prices);
    expect(comparison.scheduled.finalValue).toBeGreaterThan(comparison.lumpSum.finalValue);
    expect(comparison.winner).toBe("scheduled");
  });

  it("est une égalité quand la stratégie est déjà un investissement unique", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-05", price: 140 },
    ];
    const comparison = compareStrategies(input({ amount: 1000, frequency: "once" }), prices);
    expect(comparison.winner).toBe("tie");
    expect(comparison.difference).toBeCloseTo(0, 6);
  });
});
