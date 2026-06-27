// Helpers de formatage en français. Centralisés ici pour que toute l'interface
// affiche les nombres de manière cohérente.

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Montant en euros / dollars. Au-dela de mille, on masque les décimales pour
// rester lisible ; en dessous, on les garde.
export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const body = abs >= 1000 ? nf0.format(value) : nf2.format(value);
  return `${body} $`;
}

// Prix d'un actif, avec un nombre de décimales adapté à l'ordre de grandeur.
export function formatPrice(value: number): string {
  if (value >= 100) return `${nf0.format(value)} $`;
  if (value >= 1) return `${nf2.format(value)} $`;
  const small = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 });
  return `${small.format(value)} $`;
}

// Ratio en pourcentage avec signe explicite. 0.303 devient "+30,3 %".
export function formatPercent(ratio: number, withSign = true): string {
  const pct = ratio * 100;
  const sign = withSign && pct > 0 ? "+" : "";
  const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  return `${sign}${nf.format(pct)} %`;
}

// Date "YYYY-MM-DD" vers un libelle court français, par exemple "janv. 2022".
export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Date complète courte en français, par exemple "15 mars 2021".
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
