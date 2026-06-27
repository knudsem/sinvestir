import { describe, it, expect } from "vitest";
import { buildDenseSeries } from "../priceSeries.js";

describe("buildDenseSeries", () => {
  it("renvoie null quand il n'y a aucune donnée exploitable", () => {
    expect(buildDenseSeries([])).toBeNull();
    expect(
      buildDenseSeries([{ date: "2021-01-01", price: 0 }])
    ).toBeNull();
  });

  it("comble les jours manquants avec le dernier prix connu", () => {
    const series = buildDenseSeries([
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-04", price: 130 },
    ]);
    expect(series).not.toBeNull();
    expect(series?.firstDate).toBe("2021-01-01");
    expect(series?.lastDate).toBe("2021-01-04");
    expect(series?.priceAsOf("2021-01-01")).toBe(100);
    // Les jours de trou reprennent la dernière valeur connue.
    expect(series?.priceAsOf("2021-01-02")).toBe(100);
    expect(series?.priceAsOf("2021-01-03")).toBe(100);
    expect(series?.priceAsOf("2021-01-04")).toBe(130);
  });

  it("renvoie undefined en dehors de la plage couverte", () => {
    const series = buildDenseSeries([{ date: "2021-01-01", price: 100 }]);
    expect(series?.priceAsOf("2020-12-31")).toBeUndefined();
    expect(series?.priceAsOf("2021-01-02")).toBeUndefined();
  });

  it("ignore les prix invalides et garde la dernière valeur des jours en double", () => {
    const series = buildDenseSeries([
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-01", price: 110 },
      { date: "2021-01-02", price: Number.NaN },
      { date: "2021-01-02", price: 120 },
    ]);
    expect(series?.priceAsOf("2021-01-01")).toBe(110);
    expect(series?.priceAsOf("2021-01-02")).toBe(120);
  });
});
