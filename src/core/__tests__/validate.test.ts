import { describe, it, expect } from "vitest";
import { validateInput } from "../validate.js";

describe("validateInput", () => {
  it("accepte une entrée complète et valide", () => {
    expect(
      validateInput({
        coinId: "BTC",
        currency: "usd",
        amount: 100,
        frequency: "monthly",
        startDate: "2020-01-01",
        endDate: "2024-01-01",
      })
    ).toEqual([]);
  });

  it("rejette un montant non positif", () => {
    const errors = validateInput({
      coinId: "BTC",
      currency: "usd",
      amount: 0,
      frequency: "once",
      startDate: "2020-01-01",
      endDate: "2024-01-01",
    });
    expect(errors.some((e) => e.field === "amount")).toBe(true);
  });

  it("rejette une date de fin antérieure à la date de début", () => {
    const errors = validateInput({
      coinId: "BTC",
      currency: "usd",
      amount: 100,
      frequency: "once",
      startDate: "2024-01-01",
      endDate: "2020-01-01",
    });
    expect(errors.some((e) => e.field === "endDate")).toBe(true);
  });

  it("collecte une erreur pour chaque champ manquant", () => {
    const errors = validateInput({});
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("coinId");
    expect(fields).toContain("currency");
    expect(fields).toContain("amount");
    expect(fields).toContain("frequency");
    expect(fields).toContain("startDate");
    expect(fields).toContain("endDate");
  });
});
