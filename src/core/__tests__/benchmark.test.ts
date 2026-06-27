import { describe, it, expect } from "vitest";
import { compareToSavings } from "../benchmark.js";
import type { Contribution } from "../types.js";

function contribution(date: string, amountInvested: number): Contribution {
  return { date, amountInvested, price: 1, unitsBought: amountInvested };
}

describe("compareToSavings", () => {
  it("fait croître un apport unique au taux annuel sur un an", () => {
    const result = compareToSavings([contribution("2021-01-01", 1000)], 1500, "2022-01-01", 0.03);
    expect(result.savingsValue).toBeCloseTo(1030, 1);
    expect(result.totalInvested).toBe(1000);
    expect(result.cryptoValue).toBe(1500);
    // La crypto a fait mieux : 1500 contre environ 1030.
    expect(result.difference).toBeCloseTo(470, 1);
  });

  it("compose chaque apport selon sa propre ancienneté", () => {
    // 1000 placés deux ans, 1000 placés un an, a 3 pour cent.
    const result = compareToSavings(
      [contribution("2021-01-01", 1000), contribution("2022-01-01", 1000)],
      0,
      "2023-01-01",
      0.03
    );
    const expected = 1000 * Math.pow(1.03, 2) + 1000 * Math.pow(1.03, 1);
    expect(result.savingsValue).toBeCloseTo(expected, 1);
    expect(result.totalInvested).toBe(2000);
    // La crypto vaut zéro : le livret l'emporte largement.
    expect(result.difference).toBeCloseTo(-expected, 1);
  });

  it("renvoie un livret égal au capital quand le taux est nul", () => {
    const result = compareToSavings([contribution("2021-01-01", 500)], 500, "2025-01-01", 0);
    expect(result.savingsValue).toBeCloseTo(500, 6);
  });

  it("gère une liste d'apports vide", () => {
    const result = compareToSavings([], 0, "2022-01-01", 0.03);
    expect(result.savingsValue).toBe(0);
    expect(result.totalInvested).toBe(0);
  });
});
