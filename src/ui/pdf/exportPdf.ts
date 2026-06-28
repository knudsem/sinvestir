import type {
  SimulationResult,
  StrategyComparison,
  SavingsComparison,
} from "../../core/index.js";
import { adjustForInflation } from "../../core/index.js";
import { formatMoney, formatPercent, formatPrice, formatDate, formatMonthYear } from "../format.js";

const INFLATION_RATE = 0.02;

// Palette du rapport : fond blanc, encre sombre, bleu pour l'identité et le
// graphique, or foncé pour les gains (lisibles sur blanc). Couleurs en RGB.
const INK: [number, number, number] = [26, 34, 48];
const MUTED: [number, number, number] = [108, 117, 130];
const FAINT: [number, number, number] = [150, 159, 170];
const ACCENT: [number, number, number] = [16, 152, 248];
const POS: [number, number, number] = [170, 124, 20];
const POS_SOFT: [number, number, number] = [250, 243, 217];
const NEG: [number, number, number] = [205, 70, 79];
const NEG_SOFT: [number, number, number] = [251, 235, 236];
const CARD: [number, number, number] = [246, 248, 250];
const BORDER: [number, number, number] = [227, 232, 237];

// Les formateurs français utilisent une espace fine insecable comme séparateur de
// milliers (U+202F), glyphe absent des polices standard de jsPDF, qui s'affichait
// comme un slash. On la remplace par une espace normale pour un rendu propre.
function sp(value: string): string {
  return value.replace(/\u202F/g, " ").replace(/\u00A0/g, " ");
}

// Construit le document PDF (sans le sauvegarder). Isolé pour pouvoir être testé.
export async function buildSimulationPdf(
  result: SimulationResult,
  comparison: StrategyComparison,
  savings: SavingsComparison,
  coinName: string
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 44;
  const contentW = W - 2 * M;

  const m = result.metrics;
  const inflation = adjustForInflation(
    result.finalValue,
    m.annualizedReturn,
    result.effectiveStartDate,
    result.effectiveEndDate,
    INFLATION_RATE
  );
  const isLumpSum = result.input.frequency === "once";
  const gainPositive = result.absoluteGain >= 0;
  const today = sp(formatDate(new Date().toISOString().slice(0, 10)));

  let y = 54;

  // En-tete
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.setFontSize(8.5);
  doc.text("S'INVESTIR  ·  SIMULATEURS", M, y);
  y += 23;
  doc.setTextColor(...INK);
  doc.setFontSize(23);
  doc.text("Simulateur crypto", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...FAINT);
  doc.text(today, W - M, y, { align: "right" });
  y += 13;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2.5);
  doc.line(M, y, M + 52, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(M + 58, y, W - M, y);
  y += 27;

  // Scénario
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  const freqMap: Record<string, string> = {
    daily: "Apport quotidien",
    weekly: "Apport hebdomadaire",
    monthly: "Apport mensuel",
  };
  const freqLabel = isLumpSum ? "Placement unique" : freqMap[result.input.frequency] ?? "Apport";
  const scénario = `${freqLabel} de ${sp(formatMoney(result.input.amount))} sur le ${coinName}, de ${formatMonthYear(
    result.effectiveStartDate
  )} à ${formatMonthYear(result.effectiveEndDate)}.`;
  for (const line of doc.splitTextToSize(scénario, contentW) as string[]) {
    doc.text(line, M, y);
    y += 14;
  }
  y += 17;

  // Résultat principal et badge de performance
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.setFontSize(31);
  const valueStr = sp(formatMoney(result.finalValue));
  doc.text(valueStr, M, y);
  const valueW = doc.getTextWidth(valueStr);

  doc.setFontSize(12);
  const pctStr = sp(formatPercent(result.percentageGain));
  const padX = 10;
  const badgeH = 21;
  const badgeW = doc.getTextWidth(pctStr) + padX * 2;
  const badgeX = M + valueW + 14;
  const badgeY = y - 16;
  doc.setFillColor(...(gainPositive ? POS_SOFT : NEG_SOFT));
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, "F");
  doc.setTextColor(...(gainPositive ? POS : NEG));
  doc.text(pctStr, badgeX + padX, badgeY + 14.5);
  y += 18;

  // Note d'inflation
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(...FAINT);
  const startYear = result.effectiveStartDate.slice(0, 4);
  const inflLine = `Après inflation (${sp(formatPercent(inflation.rate, false))}/an) : ${sp(
    formatMoney(inflation.realValue)
  )} en euros de ${startYear}, soit ${sp(formatPercent(inflation.realAnnualReturn))}/an en termes réels.`;
  for (const line of doc.splitTextToSize(inflLine, contentW) as string[]) {
    doc.text(line, M, y);
    y += 12;
  }
  y += 16;

  // Grille d'indicateurs (3 x 3 cartes)
  const cards: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    { label: "TOTAL INVESTI", value: sp(formatMoney(result.totalInvested)) },
    { label: "GAIN", value: sp(formatMoney(result.absoluteGain)), color: gainPositive ? POS : NEG },
    {
      label: "RENDEMENT / AN",
      value: sp(formatPercent(m.annualizedReturn)),
      color: m.annualizedReturn >= 0 ? POS : NEG,
    },
    { label: "PRIX D'ACHAT MOYEN", value: sp(formatPrice(m.averageBuyPrice)) },
    { label: "PIRE BAISSE", value: sp(formatPercent(-m.maxDrawdown, false)), color: NEG },
    { label: "VOLATILITÉ / AN", value: sp(formatPercent(m.volatility, false)) },
    { label: "TEMPS EN PROFIT", value: sp(formatPercent(m.timeInProfit, false)) },
    { label: "SOMMET", value: sp(formatMoney(m.peakValue)) },
    { label: "APPORTS", value: String(m.contributionCount) },
  ];
  const cols = 3;
  const gap = 9;
  const cardH = 46;
  const cardW = (contentW - gap * (cols - 1)) / cols;
  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = M + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    doc.setFillColor(...CARD);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.8);
    doc.roundedRect(cx, cy, cardW, cardH, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(card.label, cx + 12, cy + 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...(card.color ?? INK));
    doc.text(card.value, cx + 12, cy + 34);
  });
  y += Math.ceil(cards.length / cols) * (cardH + gap) + 10;

  // Légende du graphique
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setFillColor(...ACCENT);
  doc.rect(M, y - 6, 14, 3, "F");
  doc.setTextColor(...MUTED);
  doc.text("Valeur du portefeuille", M + 20, y - 2.5);
  const legend2X = M + 20 + doc.getTextWidth("Valeur du portefeuille") + 18;
  doc.setFillColor(...FAINT);
  doc.rect(legend2X, y - 6, 14, 3, "F");
  doc.text("Investi cumule", legend2X + 20, y - 2.5);
  y += 8;

  // Graphique
  const chartX = M;
  const chartY = y;
  const chartW = contentW;
  const chartH = 166;
  doc.setFillColor(252, 253, 254);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.roundedRect(chartX, chartY, chartW, chartH, 6, 6, "FD");

  const tl = result.timeline;
  if (tl.length > 1) {
    const step = Math.max(1, Math.floor(tl.length / 200));
    const pts: typeof tl = [];
    for (let i = 0; i < tl.length; i += step) pts.push(tl[i]);
    pts.push(tl[tl.length - 1]);

    let vMax = 0;
    for (const p of pts) vMax = Math.max(vMax, p.value, p.invested);
    vMax = vMax * 1.08 || 1;

    const gutter = 50;
    const padR = 14;
    const padV = 14;
    const plotL = chartX + gutter;
    const plotR = chartX + chartW - padR;
    const plotT = chartY + padV;
    const plotB = chartY + chartH - padV;
    const px = (i: number) => plotL + (i / (pts.length - 1)) * (plotR - plotL);
    const py = (v: number) => plotB - (v / vMax) * (plotB - plotT);

    // Lignes de grille et axe vertical
    doc.setFontSize(6.5);
    for (let k = 0; k <= 4; k += 1) {
      const v = (vMax / 4) * k;
      const gy = py(v);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(plotL, gy, plotR, gy);
      doc.setTextColor(...FAINT);
      doc.text(sp(formatMoney(v)), plotL - 6, gy + 2.5, { align: "right" });
    }

    // Ligne investi (grise pointillee)
    doc.setDrawColor(...FAINT);
    doc.setLineWidth(0.8);
    doc.setLineDashPattern([2, 2], 0);
    for (let i = 1; i < pts.length; i += 1) {
      doc.line(px(i - 1), py(pts[i - 1].invested), px(i), py(pts[i].invested));
    }
    doc.setLineDashPattern([], 0);

    // Ligne valeur (bleu)
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(1.5);
    for (let i = 1; i < pts.length; i += 1) {
      doc.line(px(i - 1), py(pts[i - 1].value), px(i), py(pts[i].value));
    }

    // Axe horizontal (dates)
    doc.setFontSize(6.5);
    doc.setTextColor(...FAINT);
    doc.text(formatMonthYear(pts[0].date), plotL, chartY + chartH + 12);
    doc.text(formatMonthYear(pts[pts.length - 1].date), plotR, chartY + chartH + 12, { align: "right" });
  }
  y = chartY + chartH + 28;

  // Comparaisons (barres visuelles)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("Comparaisons", M, y);
  y += 20;

  const drawBar = (
    rowY: number,
    label: string,
    valueStr: string,
    ratio: number,
    fill: [number, number, number]
  ) => {
    const labelW = 90;
    const valueW = 98;
    const trackX = M + labelW;
    const trackW = contentW - labelW - valueW;
    const trackH = 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, M, rowY + 11);
    doc.setFillColor(...CARD);
    doc.roundedRect(trackX, rowY, trackW, trackH, 3, 3, "F");
    const filled = Math.max(2, trackW * Math.max(0, Math.min(1, ratio)));
    doc.setFillColor(...fill);
    doc.roundedRect(trackX, rowY, filled, trackH, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(valueStr, M + contentW, rowY + 11, { align: "right" });
    return rowY + trackH + 9;
  };

  const ratePct = sp(formatPercent(savings.rate, false));
  const benchGap = sp(formatMoney(Math.abs(savings.difference)));
  const cryptoWins = savings.difference >= 0;
  const benchMax = Math.max(savings.cryptoValue, savings.savingsValue, 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Crypto contre un Livret A (${ratePct})`, M, y);
  y += 15;
  y = drawBar(y, coinName, sp(formatMoney(savings.cryptoValue)), savings.cryptoValue / benchMax, cryptoWins ? ACCENT : FAINT);
  y = drawBar(y, "Livret A", sp(formatMoney(savings.savingsValue)), savings.savingsValue / benchMax, cryptoWins ? FAINT : ACCENT);
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...FAINT);
  const benchTake = cryptoWins
    ? `Soit ${benchGap} de plus pour la crypto, en échange d'un risque nettement supérieur.`
    : `Soit ${benchGap} de plus pour le livret, et sans aucun risque.`;
  for (const line of doc.splitTextToSize(benchTake, contentW) as string[]) {
    doc.text(line, M, y);
    y += 12;
  }
  y += 16;

  if (!isLumpSum) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("Progressivement ou tout d'un coup", M, y);
    y += 15;
    const dcaMax = Math.max(comparison.scheduled.finalValue, comparison.lumpSum.finalValue, 1);
    y = drawBar(y, "Étalé", sp(formatMoney(comparison.scheduled.finalValue)), comparison.scheduled.finalValue / dcaMax, comparison.winner === "scheduled" ? ACCENT : FAINT);
    y = drawBar(y, "En une fois", sp(formatMoney(comparison.lumpSum.finalValue)), comparison.lumpSum.finalValue / dcaMax, comparison.winner === "lumpSum" ? ACCENT : FAINT);
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(...FAINT);
    const dcaGap = sp(formatMoney(Math.abs(comparison.difference)));
    const dcaTake =
      comparison.winner === "tie"
        ? "Résultat identique sur cette période."
        : comparison.winner === "scheduled"
          ? `Soit ${dcaGap} de plus en étalant les achats qu'en investissant tout au départ.`
          : `Soit ${dcaGap} de plus en investissant tout au départ qu'en étalant les achats.`;
    for (const line of doc.splitTextToSize(dcaTake, contentW) as string[]) {
      doc.text(line, M, y);
      y += 12;
    }
  }

  // Pied de page
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(M, pageH - 46, W - M, pageH - 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...FAINT);
  doc.text("Prix Binance  ·  A but pédagogique, pas un conseil en investissement.", M, pageH - 31);

  return doc;
}

// Génère et télécharge le rapport. jsPDF est chargé à la demande (import dynamique)
// pour ne pas peser sur le bundle initial.
export async function exportSimulationPdf(
  result: SimulationResult,
  comparison: StrategyComparison,
  savings: SavingsComparison,
  coinName: string
): Promise<void> {
  const doc = await buildSimulationPdf(result, comparison, savings, coinName);
  doc.save(`simulation-${result.input.coinId.toLowerCase()}.pdf`);
}
