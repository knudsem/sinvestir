import { describe, it, expect } from "vitest";
import {
  computeAverageBuyPrice,
  computeMaxDrawdown,
  computeAnnualizedReturn,
  computeTimeInProfit,
  findRateByBisection,
} from "../metrics.js";
import type { Contribution, TimelinePoint } from "../types.js";

function contribution(date: string, amountInvested: number, price: number): Contribution {
  return { date, amountInvested, price, unitsBought: amountInvested / price };
}

function timeline(values: number[]): TimelinePoint[] {
  return values.map((value, index) => ({
    date: `2021-01-${String(index + 1).padStart(2, "0")}`,
    invested: 0,
    value,
  }));
}

function timelineWithCost(pairs: Array<[invested: number, value: number]>): TimelinePoint[] {
  return pairs.map(([invested, value], index) => ({
    date: `2021-01-${String(index + 1).padStart(2, "0")}`,
    invested,
    value,
  }));
}

describe("computeAverageBuyPrice", () => {
  it("renvoie le total investi divisé par le total d'unités", () => {
    expect(computeAverageBuyPrice(300, 3)).toBeCloseTo(100, 10);
  });

  it("renvoie zéro quand aucune unité n'a été achetée", () => {
    expect(computeAverageBuyPrice(300, 0)).toBe(0);
  });
});

describe("computeMaxDrawdown", () => {
  it("capture la pire baisse pic-à-creux", () => {
    // Pic 120, creux 90 => baisse de 0.25.
    expect(computeMaxDrawdown(timeline([100, 120, 90, 110]))).toBeCloseTo(0.25, 10);
  });

  it("vaut zéro pour une hausse monotone", () => {
    expect(computeMaxDrawdown(timeline([100, 110, 120]))).toBe(0);
  });

  it("vaut zéro pour une courbe vide", () => {
    expect(computeMaxDrawdown([])).toBe(0);
  });

  it("rapporte un effondrement total comme un", () => {
    expect(computeMaxDrawdown(timeline([100, 0]))).toBeCloseTo(1, 10);
  });
});

describe("computeTimeInProfit", () => {
  it("renvoie la part des jours au moins égaux à l'investi", () => {
    // Jour 1 sous l'eau (90 < 100), jours 2 et 3 au moins à l'équilibre.
    const series = timelineWithCost([
      [100, 90],
      [100, 100],
      [100, 130],
    ]);
    expect(computeTimeInProfit(series)).toBeCloseTo(2 / 3, 10);
  });

  it("vaut zéro pour une courbe vide", () => {
    expect(computeTimeInProfit([])).toBe(0);
  });

  it("vaut un quand jamais sous l'eau", () => {
    const series = timelineWithCost([
      [100, 100],
      [100, 120],
    ]);
    expect(computeTimeInProfit(series)).toBe(1);
  });
});

describe("computeAnnualizedReturn (XIRR)", () => {
  it("correspond au CAGR pour un investissement unique qui double sur un an", () => {
    const result = computeAnnualizedReturn(
      [contribution("2021-01-01", 1000, 100)],
      2000,
      "2021-01-01",
      "2022-01-01"
    );
    expect(result).toBeCloseTo(1, 4);
  });

  it("correspond au CAGR pour un investissement unique qui double sur deux ans", () => {
    const result = computeAnnualizedReturn(
      [contribution("2021-01-01", 1000, 100)],
      2000,
      "2021-01-01",
      "2023-01-01"
    );
    // 2 ** (1 / 2) - 1
    expect(result).toBeCloseTo(Math.SQRT2 - 1, 4);
  });

  it("renvoie un taux négatif pour un unique qui se divise par deux sur un an", () => {
    const result = computeAnnualizedReturn(
      [contribution("2021-01-01", 1000, 100)],
      500,
      "2021-01-01",
      "2022-01-01"
    );
    expect(result).toBeCloseTo(-0.5, 4);
  });

  it("rapporte une perte totale comme moins un", () => {
    const result = computeAnnualizedReturn(
      [contribution("2021-01-01", 1000, 100)],
      0,
      "2021-01-01",
      "2022-01-01"
    );
    expect(result).toBe(-1);
  });

  it("résout un rendement pondéré par les flux pour un DCA à deux apports", () => {
    // -100 à l'année 0, -100 à l'année 1, +150 à l'année 1.
    // NPV(r) = -100 + 50 / (1 + r) = 0  =>  r = -0.5
    const result = computeAnnualizedReturn(
      [
        contribution("2021-01-01", 100, 100),
        contribution("2022-01-01", 100, 50),
      ],
      150,
      "2021-01-01",
      "2022-01-01"
    );
    expect(result).toBeCloseTo(-0.5, 4);
  });

  it("renvoie zéro quand il n'y a aucun apport", () => {
    expect(computeAnnualizedReturn([], 1000, "2021-01-01", "2022-01-01")).toBe(0);
  });
});

describe("findRateByBisection", () => {
  it("trouve la racine d'une fonction décroissante simple", () => {
    // 1000 / (1 + r) - 500 = 0  =>  r = 1
    const root = findRateByBisection((r) => 1000 / (1 + r) - 500);
    expect(root).toBeCloseTo(1, 6);
  });

  it("trouve une racine négative", () => {
    // 1000 / (1 + r) - 2000 = 0  =>  r = -0.5
    const root = findRateByBisection((r) => 1000 / (1 + r) - 2000);
    expect(root).toBeCloseTo(-0.5, 6);
  });

  it("renvoie zéro quand aucune racine ne peut être encadrée", () => {
    // Toujours positif, ne croise jamais zéro.
    expect(findRateByBisection(() => 5)).toBe(0);
  });
});
