// Utilitaires de dates sûrs en UTC. Chaque date est traitée à minuit UTC pour que
// les résultats ne varient jamais selon le fuseau horaire de la machine. Les
// dates circulent sous forme de chaînes "YYYY-MM-DD" aux frontières et sous forme
// d'objets Date en interne.

// Convertit une chaîne "YYYY-MM-DD" en Date à minuit UTC.
// Renvoie une Date invalide quand l'entrée est mal formée.
export function parseUTCDate(iso: string): Date {
  const parts = iso.split("-");
  if (parts.length !== 3) return new Date(NaN);
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return new Date(NaN);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

// Formate une Date en chaîne "YYYY-MM-DD" en UTC.
export function formatUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Renvoie vrai quand la chaîne est une date "YYYY-MM-DD" valide.
export function isValidISODate(iso: string): boolean {
  const d = parseUTCDate(iso);
  return !Number.isNaN(d.getTime()) && formatUTCDate(d) === iso;
}

// Ajoute un nombre de jours à une date et renvoie une nouvelle Date.
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Ajoute un nombre de mois à une date, en bornant le jour au dernier jour valide
// du mois cible. Par exemple, ajouter un mois au 31 janvier donne le 28 février
// (ou le 29 sur une année bissextile).
export function addMonths(date: Date, months: number): Date {
  const targetDay = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(targetDay, daysInTargetMonth));
  return result;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}
