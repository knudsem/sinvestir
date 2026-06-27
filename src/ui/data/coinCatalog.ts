import type { CoinSummary } from "../../core/index.js";

// Liste sélectionnée des grandes cryptomonnaies disponibles sur Binance en paire USDT.
// Afficher les centaines de paires de Binance dans un menu déroulant serait une
// mauvaise expérience ; on retient donc les actifs majeurs, avec leur vrai nom et
// leur date d'entrée en cotation (utile pour proposer une plage par défaut sensée).
// Un sélecteur exhaustif avec recherche, alimenté par exchangeInfo, est une
// évolution naturelle.

export interface CatalogCoin extends CoinSummary {
  // Date approximative de début de cotation de la paire USDT sur Binance. Le moteur
  // borne de toute façon la simulation aux données réellement disponibles.
  since: string;
}

export const COIN_CATALOG: CatalogCoin[] = [
  { id: "BTC", symbol: "BTC", name: "Bitcoin", since: "2011-08-18" },
  { id: "ETH", symbol: "ETH", name: "Ethereum", since: "2017-08-17" },
  { id: "BNB", symbol: "BNB", name: "BNB", since: "2017-11-06" },
  { id: "SOL", symbol: "SOL", name: "Solana", since: "2020-08-11" },
  { id: "XRP", symbol: "XRP", name: "XRP", since: "2018-05-04" },
  { id: "ADA", symbol: "ADA", name: "Cardano", since: "2018-04-17" },
  { id: "DOGE", symbol: "DOGE", name: "Dogecoin", since: "2019-07-05" },
  { id: "AVAX", symbol: "AVAX", name: "Avalanche", since: "2020-09-22" },
  { id: "DOT", symbol: "DOT", name: "Polkadot", since: "2020-08-18" },
  { id: "LINK", symbol: "LINK", name: "Chainlink", since: "2019-01-16" },
  { id: "LTC", symbol: "LTC", name: "Litecoin", since: "2017-12-13" },
  { id: "TRX", symbol: "TRX", name: "TRON", since: "2018-06-11" },
];

const BY_ID = new Map(COIN_CATALOG.map((coin) => [coin.id, coin]));

export function catalogCoin(coinId: string): CatalogCoin | undefined {
  return BY_ID.get(coinId);
}

// Date de début à demander pour un coin donné (sa date de cotation, ou un repli
// raisonnable si le coin est inconnu du catalogue).
export function inceptionOf(coinId: string): string {
  return BY_ID.get(coinId)?.since ?? "2017-01-01";
}
