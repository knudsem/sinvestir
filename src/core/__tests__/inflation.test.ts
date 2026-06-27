import { describe, it, expect } from "vitest";
import { adjustForInflation } from "../inflation.js";

describe("adjustForInflation", () => {
  it("déflate la valeur finale en euros de l'année de départ", () => {
    // 1030 dans un an, inflation 3 pour cent => environ 1000 en pouvoir d'achat initial.
    const adj = adjustForInflation(1030, 0.03, "2021-01-01", "2022-01-01", 0.03);
    expect(adj.realValue).toBeCloseTo(1000, 0);
  });

  it("retire l'inflation du rendement nominal", () => {
    // Nominal 10 pour cent, inflation 3 pour cent => réel (1.1/1.03 - 1) environ 6.8 pour cent.
    const adj = adjustForInflation(2000, 0.1, "2021-01-01", "2023-01-01", 0.03);
    expect(adj.realAnnualReturn).toBeCloseTo(1.1 / 1.03 - 1, 6);
  });

  it("laisse la valeur inchangée quand l'inflation est nulle", () => {
    const adj = adjustForInflation(1500, 0.2, "2021-01-01", "2024-01-01", 0);
    expect(adj.realValue).toBeCloseTo(1500, 6);
    expect(adj.realAnnualReturn).toBeCloseTo(0.2, 6);
  });
});
