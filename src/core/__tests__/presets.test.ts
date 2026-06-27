import { describe, it, expect } from "vitest";
import { getPresetRange, getPresetRangeExcludingToday } from "../presets.js";

describe("getPresetRange", () => {
  it("calcule une plage d'un an se terminant à la date de référence", () => {
    expect(getPresetRange("1y", "2024-06-15")).toEqual({
      startDate: "2023-06-15",
      endDate: "2024-06-15",
    });
  });

  it("calcule une plage de cinq ans", () => {
    expect(getPresetRange("5y", "2024-06-15")).toEqual({
      startDate: "2019-06-15",
      endDate: "2024-06-15",
    });
  });

  it("calcule une plage de trois mois", () => {
    expect(getPresetRange("3m", "2024-06-15")).toEqual({
      startDate: "2024-03-15",
      endDate: "2024-06-15",
    });
  });

  it("utilise une ancre lointaine pour la plage max", () => {
    const range = getPresetRange("max", "2024-06-15");
    expect(range.endDate).toBe("2024-06-15");
    expect(range.startDate).toBe("2009-01-01");
  });

  it("borne le jour quand la référence est une fin de mois", () => {
    // Un mois avant le 31 mars se borne au dernier jour de février.
    expect(getPresetRange("1m", "2024-03-31")).toEqual({
      startDate: "2024-02-29",
      endDate: "2024-03-31",
    });
  });
});

describe("getPresetRangeExcludingToday", () => {
  it("se termine la veille de la date de référence", () => {
    expect(getPresetRangeExcludingToday("1y", "2024-06-15")).toEqual({
      startDate: "2023-06-14",
      endDate: "2024-06-14",
    });
  });
});
