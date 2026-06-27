// Un coin tel qu'affiché dans le sélecteur. "id" est ce dont le provider actif a
// besoin pour récupérer les prix (pour le provider Binance, c'est le symbole de
// l'actif de base, par exemple "BTC"). "name" retombe sur le symbole quand aucun
// nom d'affichage n'est disponible.
export interface CoinSummary {
  id: string;
  symbol: string;
  name: string;
  logoUrl?: string;
}
