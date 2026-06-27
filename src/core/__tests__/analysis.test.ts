import { describe, it, expect } from "vitest";
import { analyzeContributions } from "../analysis.js";
import type { Contribution } from "../types.js";

function contribution(date: string, amountInvested: number, price: number): Contribution {
  return { date, amountInvested, price, unitsBought: amountInvested / price };
}

describe("analyzeContributions", () => {
  it("renvoie des valeurs nulles pour une liste d'apports vide", () => {
    expect(analyzeContributions([], 100)).toEqual({ best: null, worst: null });
  });

  it("renvoie des valeurs nulles quand le prix final est inexploitable", () => {
    expect(analyzeContributions([contribution("2021-01-01", 100, 100)], 0)).toEqual({
      best: null,
      worst: null,
    });
  });

  it("choisit l'achat au prix le plus bas comme meilleur et le plus haut comme pire", () => {
    const contributions = [
      contribution("2021-01-01", 100, 100),
      contribution("2021-01-02", 100, 50),
      contribution("2021-01-03", 100, 200),
    ];
    const finalPrice = 150;
    const { best, worst } = analyzeContributions(contributions, finalPrice);

    // Le prix d'achat le plus bas (50) est le meilleur résultat.
    expect(best?.date).toBe("2021-01-02");
    // 100 investis au prix 50 achètent 2 unités, valant 300 au prix 150, soit plus 200 pour cent.
    expect(best?.valueAtEnd).toBeCloseTo(300, 10);
    expect(best?.returnRatio).toBeCloseTo(2, 10);

    // Le prix d'achat le plus haut (200) est le pire résultat.
    expect(worst?.date).toBe("2021-01-03");
    // 100 investis au prix 200 achètent 0.5 unité, valant 75 au prix 150, soit moins 25 pour cent.
    expect(worst?.valueAtEnd).toBeCloseTo(75, 10);
    expect(worst?.returnRatio).toBeCloseTo(-0.25, 10);
  });
});
