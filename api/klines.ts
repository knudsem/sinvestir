// Fonction serverless Vercel : proxy public vers les prix journaliers. Elle resout
// le CORS (le navigateur appelle notre propre domaine), gere la pagination et le
// cache cote serveur, et assemble les sources (Bitstamp pour l'historique profond
// du BTC, Binance ensuite). La region est epinglee en Europe via vercel.json.

import type { ServerlessRequest, ServerlessResponse } from "../src/server/serverlessTypes.js";
import { msFromIso } from "../src/server/binanceSource.js";
import { getDailyPrices } from "../src/server/priceService.js";

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  const coin = String(req.query.coin ?? "").trim();
  const currency = String(req.query.currency ?? "usd").trim();
  const start = String(req.query.start ?? "").trim();
  const end = String(req.query.end ?? "").trim();

  if (!coin || !start || !end) {
    res.status(400).json({ error: "Paramètres coin, start et end requis." });
    return;
  }

  try {
    const prices = await getDailyPrices({
      coinId: coin,
      currency,
      startMs: msFromIso(start),
      endMs: msFromIso(end),
    });
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ prices });
  } catch {
    res.status(502).json({ error: "Source de prix indisponible." });
  }
}
