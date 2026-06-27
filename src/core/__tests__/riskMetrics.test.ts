import { describe, it, expect } from "vitest";
import { computeAnnualizedVolatility, computePeak } from "../metrics.js";
import type { TimelinePoint } from "../types.js";

describe("computeAnnualizedVolatility", () => {
  it("vaut zéro pour un prix parfaitement stable", () => {
    expect(computeAnnualizedVolatility([100, 100, 100, 100])).toBe(0);
  });

  it("vaut zéro quand il y a moins de deux rendements", () => {
    expect(computeAnnualizedVolatility([100])).toBe(0);
    expect(computeAnnualizedVolatility([])).toBe(0);
  });

  it("ignore les prix nuls de début (avant l'arrivée des données)", () => {
    // Les zéros initiaux ne doivent pas produire de rendements parasites.
    const withLeadingZeros = computeAnnualizedVolatility([0, 0, 100, 101, 100]);
    const withoutZeros = computeAnnualizedVolatility([100, 101, 100]);
    expect(withLeadingZeros).toBeCloseTo(withoutZeros, 10);
  });

  it("croît avec l'ampleur des variations", () => {
    const calm = computeAnnualizedVolatility([100, 101, 100, 101, 100]);
    const wild = computeAnnualizedVolatility([100, 130, 80, 140, 70]);
    expect(wild).toBeGreaterThan(calm);
  });

  it("annualise par la racine du nombre de jours", () => {
    // Deux rendements alternes de plus et moins 10 pour cent.
    // Moyenne 0, écart-type sur échantillon (n-1) = 0.1 * sqrt(2). Annualise * sqrt(365).
    const vol = computeAnnualizedVolatility([100, 110, 99]);
    const r1 = 110 / 100 - 1;
    const r2 = 99 / 110 - 1;
    const mean = (r1 + r2) / 2;
    const variance = ((r1 - mean) ** 2 + (r2 - mean) ** 2) / 1;
    const expected = Math.sqrt(variance) * Math.sqrt(365);
    expect(vol).toBeCloseTo(expected, 10);
  });
});

function point(date: string, value: number): TimelinePoint {
  return { date, invested: 0, value };
}

describe("computePeak", () => {
  it("trouve la valeur maximale et sa date", () => {
    const timeline = [point("2021-01-01", 100), point("2021-01-02", 250), point("2021-01-03", 180)];
    expect(computePeak(timeline)).toEqual({ value: 250, date: "2021-01-02" });
  });

  it("renvoie un sommet nul pour une courbe vide", () => {
    expect(computePeak([])).toEqual({ value: 0, date: "" });
  });
});
