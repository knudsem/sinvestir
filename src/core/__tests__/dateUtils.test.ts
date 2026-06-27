import { describe, it, expect } from "vitest";
import {
  parseUTCDate,
  formatUTCDate,
  isValidISODate,
  addDays,
  addMonths,
} from "../dateUtils.js";

describe("dateUtils", () => {
  it("analyse et formate une date en UTC sans dérive", () => {
    const d = parseUTCDate("2021-07-14");
    expect(formatUTCDate(d)).toBe("2021-07-14");
  });

  it("signale les dates mal formées comme invalides", () => {
    expect(isValidISODate("2021-07-14")).toBe(true);
    expect(isValidISODate("2021-13-01")).toBe(false);
    expect(isValidISODate("2021-02-30")).toBe(false);
    expect(isValidISODate("not-a-date")).toBe(false);
    expect(isValidISODate("2021-7-4")).toBe(false);
  });

  it("ajoute des jours à travers une fin de mois", () => {
    expect(formatUTCDate(addDays(parseUTCDate("2021-01-30"), 3))).toBe("2021-02-02");
  });

  it("ajoute des mois et borne au dernier jour d'un mois plus court", () => {
    expect(formatUTCDate(addMonths(parseUTCDate("2021-01-31"), 1))).toBe("2021-02-28");
    expect(formatUTCDate(addMonths(parseUTCDate("2020-01-31"), 1))).toBe("2020-02-29");
    expect(formatUTCDate(addMonths(parseUTCDate("2021-01-31"), 2))).toBe("2021-03-31");
  });
});
