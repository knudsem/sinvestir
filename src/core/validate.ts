import type { SimulationInput, Frequency } from "./types.js";
import { parseUTCDate, isValidISODate } from "./dateUtils.js";

export interface ValidationError {
  field: keyof SimulationInput;
  message: string;
}

const VALID_FREQUENCIES: Frequency[] = ["once", "daily", "weekly", "monthly"];

// Valide une entrée de simulation. Renvoie un tableau vide quand l'entrée est
// valide. Cette fonction est pure pour que l'interface puisse l'appeler à chaque
// changement et afficher des erreurs en ligne, et pour que la couche de
// simulation puisse l'utiliser comme garde-fou.
export function validateInput(input: Partial<SimulationInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.coinId) {
    errors.push({ field: "coinId", message: "Sélectionnez une cryptomonnaie." });
  }

  if (!input.currency) {
    errors.push({ field: "currency", message: "Sélectionnez une devise." });
  }

  if (input.amount === undefined || input.amount === null || !(input.amount > 0)) {
    errors.push({ field: "amount", message: "Le montant doit être supérieur à zéro." });
  }

  if (!input.frequency || !VALID_FREQUENCIES.includes(input.frequency)) {
    errors.push({ field: "frequency", message: "Sélectionnez une fréquence valide." });
  }

  const hasValidStart = !!input.startDate && isValidISODate(input.startDate);
  const hasValidEnd = !!input.endDate && isValidISODate(input.endDate);

  if (!hasValidStart) {
    errors.push({ field: "startDate", message: "Indiquez une date de début valide." });
  }

  if (!hasValidEnd) {
    errors.push({ field: "endDate", message: "Indiquez une date de fin valide." });
  }

  if (hasValidStart && hasValidEnd) {
    const start = parseUTCDate(input.startDate as string);
    const end = parseUTCDate(input.endDate as string);
    if (start.getTime() > end.getTime()) {
      errors.push({
        field: "endDate",
        message: "La date de fin doit être postérieure ou égale à la date de début.",
      });
    }
  }

  return errors;
}
