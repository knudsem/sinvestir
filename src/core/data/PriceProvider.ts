import type { PricePoint } from "../types.js";
import type { CoinSummary } from "./types.js";

// L'unique couture entre l'application et toute source de données de prix.
// L'interface et le moteur de simulation ne dépendent que de cette interface,
// donc remplacer Binance par n'importe quelle autre source (ou ajouter plus tard
// une source payante plus large) est une modification d'un seul fichier, sans
// impact sur le reste du code.
export interface PriceProvider {
  // L'univers des coins simulables avec ce provider.
  listCoins(): Promise<CoinSummary[]>;

  // Prix de clôture journaliers pour le coin et la devise donnés, entre startDate
  // et endDate inclus, par ordre croissant de date. Les deux dates sont au format
  // "YYYY-MM-DD".
  getDailyPrices(params: {
    coinId: string;
    currency: string;
    startDate: string;
    endDate: string;
  }): Promise<PricePoint[]>;
}
