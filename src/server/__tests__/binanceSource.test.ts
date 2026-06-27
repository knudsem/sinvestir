import { describe, it, expect } from "vitest";
import {
  toBinanceSymbol,
  msFromIso,
  isoFromMs,
  parseKlines,
  dedupeByDate,
} from "../binanceSource.js";

describe("toBinanceSymbol", () => {
  it("représente le dollar par l'USDT", () => {
    expect(toBinanceSymbol("BTC", "usd")).toBe("BTCUSDT");
  });

  it("met l'identifiant en majuscules", () => {
    expect(toBinanceSymbol("eth", "usd")).toBe("ETHUSDT");
  });

  it("conserve une autre devise en majuscules", () => {
    expect(toBinanceSymbol("BTC", "eur")).toBe("BTCEUR");
  });
});

describe("msFromIso et isoFromMs", () => {
  it("convertit une date ISO en millisecondes UTC", () => {
    expect(msFromIso("2021-01-01")).toBe(Date.UTC(2021, 0, 1));
  });

  it("fait l'aller-retour sans dérive", () => {
    const ms = msFromIso("2023-07-15");
    expect(isoFromMs(ms)).toBe("2023-07-15");
  });

  it("reste stable en milieu de journee", () => {
    const ms = Date.UTC(2022, 5, 18, 13, 45, 0);
    expect(isoFromMs(ms)).toBe("2022-06-18");
  });
});

describe("parseKlines", () => {
  it("extrait la date d'ouverture et le cours de clôture de chaque bougie", () => {
    // Format Binance : [openTime, open, high, low, close, volume, ...].
    const raw = [
      [msFromIso("2021-01-01"), "29000.0", "29600.0", "28800.0", "29374.15", "1234.5"],
      [msFromIso("2021-01-02"), "29374.15", "33300.0", "29000.0", "32127.27", "2345.6"],
    ];
    expect(parseKlines(raw)).toEqual([
      { date: "2021-01-01", price: 29374.15 },
      { date: "2021-01-02", price: 32127.27 },
    ]);
  });

  it("ignore les lignes malformées sans planter", () => {
    const raw = [
      [msFromIso("2021-01-01"), "x", "x", "x", "100.0"],
      "pas un tableau",
      [msFromIso("2021-01-02"), "x", "x", "x", "not-a-number"],
      [msFromIso("2021-01-03"), "x", "x", "x", "120.5"],
    ];
    expect(parseKlines(raw)).toEqual([
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-03", price: 120.5 },
    ]);
  });

  it("renvoie une liste vide pour une entrée non tabulaire", () => {
    expect(parseKlines(null)).toEqual([]);
    expect(parseKlines({})).toEqual([]);
  });
});

describe("dedupeByDate", () => {
  it("retire les doublons en gardant la dernière valeur et trie par date", () => {
    const points = [
      { date: "2021-01-02", price: 110 },
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 115 },
    ];
    expect(dedupeByDate(points)).toEqual([
      { date: "2021-01-01", price: 100 },
      { date: "2021-01-02", price: 115 },
    ]);
  });
});
