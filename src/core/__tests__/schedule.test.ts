import { describe, it, expect } from "vitest";
import { generateContributionDates } from "../schedule.js";

describe("generateContributionDates", () => {
  it("renvoie une seule date pour un investissement unique", () => {
    expect(generateContributionDates("2021-01-01", "2021-12-31", "once")).toEqual([
      "2021-01-01",
    ]);
  });

  it("renvoie chaque jour pour un calendrier quotidien", () => {
    const dates = generateContributionDates("2021-01-01", "2021-01-05", "daily");
    expect(dates).toEqual([
      "2021-01-01",
      "2021-01-02",
      "2021-01-03",
      "2021-01-04",
      "2021-01-05",
    ]);
  });

  it("avance de sept jours pour un calendrier hebdomadaire", () => {
    const dates = generateContributionDates("2021-01-01", "2021-01-31", "weekly");
    expect(dates).toEqual([
      "2021-01-01",
      "2021-01-08",
      "2021-01-15",
      "2021-01-22",
      "2021-01-29",
    ]);
  });

  it("garde une ancre mensuelle stable et borne les mois courts", () => {
    const dates = generateContributionDates("2021-01-31", "2021-04-30", "monthly");
    expect(dates).toEqual([
      "2021-01-31",
      "2021-02-28",
      "2021-03-31",
      "2021-04-30",
    ]);
  });

  it("renvoie une liste vide quand le début est après la fin", () => {
    expect(generateContributionDates("2021-02-01", "2021-01-01", "daily")).toEqual([]);
  });

  it("renvoie une liste vide pour des dates mal formées", () => {
    expect(generateContributionDates("nope", "2021-01-01", "daily")).toEqual([]);
  });
});
