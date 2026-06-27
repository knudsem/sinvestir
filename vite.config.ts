import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import preact from "@preact/preset-vite";
import { msFromIso } from "./src/server/binanceSource.js";
import { getDailyPrices } from "./src/server/priceService.js";

// En développement, Vite ne fait pas tourner les fonctions serverless. Ce plugin
// expose donc /api/klines via un middleware qui reutilise exactement le même code
// que la fonction Vercel, pour une parite totale entre local et production.
function binanceDevApi(): Plugin {
  return {
    name: "binance-dev-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/klines")) {
          next();
          return;
        }
        const url = new URL(req.url, "http://localhost");
        const coin = (url.searchParams.get("coin") ?? "").trim();
        const currency = (url.searchParams.get("currency") ?? "usd").trim();
        const start = (url.searchParams.get("start") ?? "").trim();
        const end = (url.searchParams.get("end") ?? "").trim();

        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (!coin || !start || !end) {
          send(400, { error: "Paramètres coin, start et end requis." });
          return;
        }

        getDailyPrices({
          coinId: coin,
          currency,
          startMs: msFromIso(start),
          endMs: msFromIso(end),
        })
          .then((prices) => send(200, { prices }))
          .catch(() => send(502, { error: "Source de prix indisponible." }));
      });
    },
  };
}

// Configuration unique pour l'application (Vite) et les tests (Vitest). Le moteur
// (src/core) reste pur ; seule l'interface depend de Preact.
export default defineConfig({
  plugins: [preact(), binanceDevApi()],
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/core/**/*.ts"],
      exclude: [
        "src/core/**/*.test.ts",
        "src/core/index.ts",
        "src/core/types.ts",
        "src/core/data/types.ts",
        "src/core/data/PriceProvider.ts",
      ],
    },
  },
});
