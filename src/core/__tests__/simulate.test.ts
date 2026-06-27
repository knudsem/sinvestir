import { describe, it, expect } from "vitest";
import { simulate } from "../simulate.js";
import type { PricePoint, SimulationInput } from "../types.js";

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    coinId: "TEST",
    currency: "usd",
    amount: 100,
    frequency: "once",
    startDate: "2021-01-01",
    endDate: "2021-01-03",
    ...overrides,
  };
}

describe("simulate", () => {
  it("gère un investissement unique avec une hausse de prix", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 150 },
      { date: "2021-01-03", price: 200 },
    ];
    const result = simulate(
      makeInput({ amount: 1000, frequency: "once" }),
      prices
    );

    expect(result.hasData).toBe(true);
    expect(result.totalInvested).toBe(1000);
    // 1000 au prix 100 achète 10 unités.
    expect(result.totalUnits).toBeCloseTo(10, 10);
    // 10 unités au prix final 200 valent 2000.
    expect(result.finalValue).toBeCloseTo(2000, 10);
    expect(result.absoluteGain).toBeCloseTo(1000, 10);
    expect(result.percentageGain).toBeCloseTo(1, 10);
    expect(result.timeline).toHaveLength(3);
  });

  it("gère un DCA quotidien et valorise chaque apport indépendamment", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 100 },
      { date: "2021-01-03", price: 200 },
    ];
    const result = simulate(
      makeInput({ amount: 100, frequency: "daily" }),
      prices
    );

    // Trois apports de 100 chacun.
    expect(result.contributions).toHaveLength(3);
    expect(result.totalInvested).toBe(300);
    // Unités : 1 + 1 + 0.5 = 2.5
    expect(result.totalUnits).toBeCloseTo(2.5, 10);
    // Valeur finale au prix 200 = 500.
    expect(result.finalValue).toBeCloseTo(500, 10);
    expect(result.absoluteGain).toBeCloseTo(200, 10);
    expect(result.percentageGain).toBeCloseTo(200 / 300, 10);
  });

  it("rapporte une perte quand le prix baisse", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 200 },
      { date: "2021-01-02", price: 100 },
    ];
    const result = simulate(
      makeInput({ amount: 200, frequency: "once", endDate: "2021-01-02" }),
      prices
    );
    expect(result.finalValue).toBeCloseTo(100, 10);
    expect(result.absoluteGain).toBeCloseTo(-100, 10);
    expect(result.percentageGain).toBeCloseTo(-0.5, 10);
  });

  it("borne le début au premier jour de données disponible", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-05", price: 100 },
      { date: "2021-01-06", price: 110 },
    ];
    const result = simulate(
      makeInput({ frequency: "once", startDate: "2021-01-01", endDate: "2021-01-06" }),
      prices
    );
    expect(result.effectiveStartDate).toBe("2021-01-05");
    expect(result.effectiveEndDate).toBe("2021-01-06");
    expect(result.contributions[0]?.date).toBe("2021-01-05");
  });

  it("borne la fin au dernier jour de données disponible", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 120 },
    ];
    const result = simulate(
      makeInput({ frequency: "once", startDate: "2021-01-01", endDate: "2021-01-31" }),
      prices
    );
    expect(result.effectiveEndDate).toBe("2021-01-02");
    expect(result.finalValue).toBeCloseTo(120, 10);
  });

  it("renvoie un résultat vide quand il n'y a aucune donnée", () => {
    const result = simulate(makeInput(), []);
    expect(result.hasData).toBe(false);
    expect(result.totalInvested).toBe(0);
    expect(result.finalValue).toBe(0);
    expect(result.timeline).toHaveLength(0);
  });

  it("renvoie un résultat vide quand la fenêtre demandée est hors des données", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 120 },
    ];
    const result = simulate(
      makeInput({ startDate: "2022-01-01", endDate: "2022-02-01" }),
      prices
    );
    expect(result.hasData).toBe(false);
    expect(result.finalValue).toBe(0);
  });

  it("comble un trou de données pour valoriser le portefeuille et les achats", () => {
    // Pas de prix le 02 janvier, il hérite donc du 01 janvier.
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-03", price: 100 },
    ];
    const result = simulate(
      makeInput({ amount: 100, frequency: "daily", endDate: "2021-01-03" }),
      prices
    );
    // Trois achats quotidiens, tous au prix 100, donc 3 unités au total pour 300 investis.
    expect(result.contributions).toHaveLength(3);
    expect(result.totalUnits).toBeCloseTo(3, 10);
    expect(result.finalValue).toBeCloseTo(300, 10);
  });

  it("garde la courbe d'investissement monotone et finissant au total investi", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 100 },
      { date: "2021-01-03", price: 100 },
    ];
    const result = simulate(
      makeInput({ amount: 100, frequency: "daily" }),
      prices
    );
    const investedSeries = result.timeline.map((p) => p.invested);
    for (let i = 1; i < investedSeries.length; i++) {
      expect(investedSeries[i]).toBeGreaterThanOrEqual(investedSeries[i - 1]);
    }
    expect(investedSeries[investedSeries.length - 1]).toBe(result.totalInvested);
  });

  it("attache des métriques cohérentes au résultat", () => {
    // Investissement unique sur exactement un an, le prix double, le XIRR vaut
    // donc environ cent pour cent.
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2022-01-01", price: 200 },
    ];
    const result = simulate(
      makeInput({
        amount: 1000,
        frequency: "once",
        startDate: "2021-01-01",
        endDate: "2022-01-01",
      }),
      prices
    );
    expect(result.metrics.contributionCount).toBe(1);
    expect(result.metrics.averageBuyPrice).toBeCloseTo(100, 6);
    expect(result.metrics.annualizedReturn).toBeCloseTo(1, 3);
    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it("renvoie des métriques à zéro quand il n'y a aucune donnée", () => {
    const result = simulate(makeInput(), []);
    expect(result.metrics).toEqual({
      contributionCount: 0,
      averageBuyPrice: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      timeInProfit: 0,
      volatility: 0,
      peakValue: 0,
      peakDate: "",
    });
    expect(result.finalPrice).toBe(0);
  });

  it("rapporte le prix final à la date de fin effective", () => {
    const prices: PricePoint[] = [
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 175 },
    ];
    const result = simulate(
      makeInput({ frequency: "once", startDate: "2021-01-01", endDate: "2021-01-02" }),
      prices
    );
    expect(result.finalPrice).toBe(175);
  });

  it("gère une fenêtre d'un seul jour où le début égale la fin", () => {
    const prices: PricePoint[] = [{ date: "2021-01-01", price: 100 }];
    const result = simulate(
      makeInput({ amount: 500, frequency: "once", startDate: "2021-01-01", endDate: "2021-01-01" }),
      prices
    );
    expect(result.hasData).toBe(true);
    expect(result.contributions).toHaveLength(1);
    expect(result.totalInvested).toBe(500);
    expect(result.finalValue).toBeCloseTo(500, 10);
    expect(result.timeline).toHaveLength(1);
    // Une fenêtre de durée nulle ne peut pas être annualisée, le taux retombe donc à zéro.
    expect(result.metrics.annualizedReturn).toBe(0);
  });
});
