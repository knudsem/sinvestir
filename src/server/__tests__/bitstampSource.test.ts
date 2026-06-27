import { describe, it, expect } from "vitest";
import { parseBitstampOhlc } from "../bitstampSource.js";

describe("parseBitstampOhlc", () => {
  it("extrait date et clôture des bougies Bitstamp", () => {
    const json = {
      data: {
        pair: "BTC/USD",
        ohlc: [
          { timestamp: String(Date.UTC(2012, 0, 1) / 1000), open: "5.2", high: "5.5", low: "5.0", close: "5.30", volume: "100" },
          { timestamp: String(Date.UTC(2012, 0, 2) / 1000), open: "5.30", high: "6.0", low: "5.3", close: "5.95", volume: "120" },
        ],
      },
    };
    expect(parseBitstampOhlc(json)).toEqual([
      { date: "2012-01-01", price: 5.3 },
      { date: "2012-01-02", price: 5.95 },
    ]);
  });

  it("ignore les bougies malformées", () => {
    const json = {
      data: {
        ohlc: [
          { timestamp: String(Date.UTC(2012, 0, 1) / 1000), close: "x" },
          { timestamp: String(Date.UTC(2012, 0, 2) / 1000), close: "7.0" },
        ],
      },
    };
    expect(parseBitstampOhlc(json)).toEqual([{ date: "2012-01-02", price: 7 }]);
  });

  it("renvoie une liste vide pour une réponse inattendue", () => {
    expect(parseBitstampOhlc(null)).toEqual([]);
    expect(parseBitstampOhlc({})).toEqual([]);
    expect(parseBitstampOhlc({ data: {} })).toEqual([]);
  });
});
