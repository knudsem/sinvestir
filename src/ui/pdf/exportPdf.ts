import type {
  SimulationResult,
  StrategyComparison,
  SavingsComparison,
} from "../../core/index.js";
import { adjustForInflation } from "../../core/index.js";
import { formatMoney, formatPercent, formatPrice, formatDate, formatMonthYear } from "../format.js";
import { PJS_REGULAR, PJS_SEMIBOLD, PJS_BOLD, PJS_EXTRABOLD, LOGO_PNG } from "./assets.js";

const INFLATION_RATE = 0.02;

// Palette du rapport : fond blanc, encre sombre, bleu pour l'identité et le
// graphique, or foncé pour les gains (lisibles sur blanc). Couleurs en RGB.
const INK: [number, number, number] = [22, 30, 46];
const MUTED: [number, number, number] = [104, 113, 128];
const FAINT: [number, number, number] = [150, 159, 170];
const ACCENT: [number, number, number] = [16, 152, 248];
const ACCENT_FILL: [number, number, number] = [228, 241, 253];
const POS: [number, number, number] = [170, 124, 20];
const POS_SOFT: [number, number, number] = [250, 243, 217];
const NEG: [number, number, number] = [205, 70, 79];
const NEG_SOFT: [number, number, number] = [251, 235, 236];
const CARD: [number, number, number] = [247, 249, 251];
const BORDER: [number, number, number] = [226, 231, 237];

// Graisses Plus Jakarta Sans enregistrees dans jsPDF (cf. registerFonts).
const REG = "PJS";
const SEMI = "PJSSemi";
const BOLD = "PJSBold";
const XBOLD = "PJSXBold";

// Le logo embarque mesure 1505 x 300 px, soit ce rapport hauteur / largeur.
const LOGO_RATIO = 300 / 1505;

// Les formateurs francais utilisent une espace fine insecable comme separateur de
// milliers (U+202F), glyphe absent des polices, qu'on remplace par une espace
// normale pour un rendu propre.
function sp(value: string): string {
  return value.replace(/\u202F/g, " ").replace(/\u00A0/g, " ").replace(/\u2212/g, "-");
}

function registerFonts(doc: import("jspdf").jsPDF): void {
  doc.addFileToVFS("PJS-Regular.ttf", PJS_REGULAR);
  doc.addFont("PJS-Regular.ttf", REG, "normal");
  doc.addFileToVFS("PJS-SemiBold.ttf", PJS_SEMIBOLD);
  doc.addFont("PJS-SemiBold.ttf", SEMI, "normal");
  doc.addFileToVFS("PJS-Bold.ttf", PJS_BOLD);
  doc.addFont("PJS-Bold.ttf", BOLD, "normal");
  doc.addFileToVFS("PJS-ExtraBold.ttf", PJS_EXTRABOLD);
  doc.addFont("PJS-ExtraBold.ttf", XBOLD, "normal");
}

// Construit le document PDF (sans le sauvegarder). Isole pour pouvoir etre teste.
export async function buildSimulationPdf(
  result: SimulationResult,
  comparison: StrategyComparison,
  savings: SavingsComparison,
  coinName: string
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  registerFonts(doc);
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

  let y = 50;

  // En-tete : logo S'investir et date
  const logoW = 152;
  const logoH = logoW * LOGO_RATIO;
  doc.addImage(LOGO_PNG, "PNG", M, y - logoH + 8, logoW, logoH);
  doc.setFont(REG, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...FAINT);
  doc.text(today, W - M, y, { align: "right" });
  y += 30;

  // Titre du rapport
  doc.setFont(XBOLD, "normal");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.setCharSpace(0.5);
  doc.text("SIMULATEUR CRYPTO", M, y);
  doc.setCharSpace(0);
  y += 11;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2.6);
  doc.line(M, y, M + 44, y);
  y += 24;

  // Scenario
  doc.setFont(REG, "normal");
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
  y += 18;

  // Resultat principal et badge de performance
  doc.setFont(XBOLD, "normal");
  doc.setTextColor(...INK);
  doc.setFontSize(32);
  const valueStr = sp(formatMoney(result.finalValue));
  doc.text(valueStr, M, y);
  const valueW = doc.getTextWidth(valueStr);

  doc.setFont(BOLD, "normal");
  doc.setFontSize(12);
  const pctStr = sp(formatPercent(result.percentageGain));
  const padX = 10;
  const badgeH = 22;
  const badgeW = doc.getTextWidth(pctStr) + padX * 2;
  const badgeX = M + valueW + 15;
  const badgeY = y - 17;
  doc.setFillColor(...(gainPositive ? POS_SOFT : NEG_SOFT));
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 11, 11, "F");
  doc.setTextColor(...(gainPositive ? POS : NEG));
  doc.text(pctStr, badgeX + padX, badgeY + 15);
  y += 17;

  // Note d'inflation
  doc.setFont(REG, "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(...FAINT);
  const startYear = result.effectiveStartDate.slice(0, 4);
  const inflLine = `Apres inflation (${sp(formatPercent(inflation.rate, false))}/an) : ${sp(
    formatMoney(inflation.realValue)
  )} en euros de ${startYear}, soit ${sp(formatPercent(inflation.realAnnualReturn))}/an en termes reels.`;
  for (const line of doc.splitTextToSize(inflLine, contentW) as string[]) {
    doc.text(line, M, y);
    y += 12;
  }
  y += 18;

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
  const gap = 10;
  const cardH = 48;
  const cardW = (contentW - gap * (cols - 1)) / cols;
  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = M + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    doc.setFillColor(...CARD);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.8);
    doc.roundedRect(cx, cy, cardW, cardH, 7, 7, "FD");
    doc.setFont(SEMI, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.4);
    doc.text(card.label, cx + 13, cy + 18);
    doc.setCharSpace(0);
    doc.setFont(XBOLD, "normal");
    doc.setFontSize(13.5);
    doc.setTextColor(...(card.color ?? INK));
    doc.text(card.value, cx + 13, cy + 36);
  });
  y += Math.ceil(cards.length / cols) * (cardH + gap) + 12;

  // Legende du graphique
  doc.setFont(SEMI, "normal");
  doc.setFontSize(8.5);
  doc.setFillColor(...ACCENT);
  doc.roundedRect(M, y - 6.5, 15, 4, 2, 2, "F");
  doc.setTextColor(...MUTED);
  doc.text("Valeur du portefeuille", M + 21, y - 2.5);
  const legend2X = M + 21 + doc.getTextWidth("Valeur du portefeuille") + 18;
  doc.setFillColor(...FAINT);
  doc.roundedRect(legend2X, y - 6.5, 15, 4, 2, 2, "F");
  doc.text("Investi cumulé", legend2X + 21, y - 2.5);
  y += 10;

  // Graphique
  const chartX = M;
  const chartY = y;
  const chartW = contentW;
  const chartH = 168;
  doc.setFillColor(252, 253, 254);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.roundedRect(chartX, chartY, chartW, chartH, 8, 8, "FD");

  const tl = result.timeline;
  if (tl.length > 1) {
    const step = Math.max(1, Math.floor(tl.length / 200));
    const pts: typeof tl = [];
    for (let i = 0; i < tl.length; i += step) pts.push(tl[i]);
    pts.push(tl[tl.length - 1]);

    let vMax = 0;
    for (const p of pts) vMax = Math.max(vMax, p.value, p.invested);
    vMax = vMax * 1.08 || 1;

    const gutter = 52;
    const padR = 16;
    const padV = 16;
    const plotL = chartX + gutter;
    const plotR = chartX + chartW - padR;
    const plotT = chartY + padV;
    const plotB = chartY + chartH - padV;
    const px = (i: number) => plotL + (i / (pts.length - 1)) * (plotR - plotL);
    const py = (v: number) => plotB - (v / vMax) * (plotB - plotT);

    // Aire bleue sous la courbe de valeur
    const area: Array<[number, number]> = [[plotL, plotB]];
    for (let i = 0; i < pts.length; i += 1) area.push([px(i), py(pts[i].value)]);
    area.push([plotR, plotB]);
    const deltas = area.slice(1).map((p, i) => [p[0] - area[i][0], p[1] - area[i][1]] as [number, number]);
    doc.setFillColor(...ACCENT_FILL);
    doc.lines(deltas, area[0][0], area[0][1], [1, 1], "F", true);

    // Lignes de grille et axe vertical (par-dessus l'aire)
    doc.setFontSize(6.5);
    for (let k = 0; k <= 4; k += 1) {
      const v = (vMax / 4) * k;
      const gy = py(v);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(plotL, gy, plotR, gy);
      doc.setTextColor(...FAINT);
      doc.text(sp(formatMoney(v)), plotL - 7, gy + 2.5, { align: "right" });
    }

    // Ligne investi (grise pointillee)
    doc.setDrawColor(...FAINT);
    doc.setLineWidth(0.9);
    doc.setLineDashPattern([2, 2], 0);
    for (let i = 1; i < pts.length; i += 1) {
      doc.line(px(i - 1), py(pts[i - 1].invested), px(i), py(pts[i].invested));
    }
    doc.setLineDashPattern([], 0);

    // Ligne valeur (bleu)
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(1.8);
    for (let i = 1; i < pts.length; i += 1) {
      doc.line(px(i - 1), py(pts[i - 1].value), px(i), py(pts[i].value));
    }

    // Axe horizontal (dates)
    doc.setFont(REG, "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...FAINT);
    doc.text(formatMonthYear(pts[0].date), plotL, chartY + chartH + 13);
    doc.text(formatMonthYear(pts[pts.length - 1].date), plotR, chartY + chartH + 13, { align: "right" });
  }
  y = chartY + chartH + 30;

  // Comparaisons
  doc.setFont(XBOLD, "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Comparaisons", M, y);
  y += 21;

  const drawBar = (
    rowY: number,
    label: string,
    barValue: string,
    ratio: number,
    fill: [number, number, number]
  ) => {
    const labelW = 92;
    const valueW = 100;
    const trackX = M + labelW;
    const trackW = contentW - labelW - valueW;
    const trackH = 16;
    doc.setFont(REG, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, M, rowY + 11.5);
    doc.setFillColor(...CARD);
    doc.roundedRect(trackX, rowY, trackW, trackH, 4, 4, "F");
    const filled = Math.max(4, trackW * Math.max(0, Math.min(1, ratio)));
    doc.setFillColor(...fill);
    doc.roundedRect(trackX, rowY, filled, trackH, 4, 4, "F");
    doc.setFont(BOLD, "normal");
    doc.setTextColor(...INK);
    doc.text(barValue, M + contentW, rowY + 11.5, { align: "right" });
    return rowY + trackH + 10;
  };

  const ratePct = sp(formatPercent(savings.rate, false));
  const benchGap = sp(formatMoney(Math.abs(savings.difference)));
  const cryptoWins = savings.difference >= 0;
  const benchMax = Math.max(savings.cryptoValue, savings.savingsValue, 1);

  doc.setFont(SEMI, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Crypto contre un Livret A (${ratePct})`, M, y);
  y += 16;
  y = drawBar(y, coinName, sp(formatMoney(savings.cryptoValue)), savings.cryptoValue / benchMax, cryptoWins ? ACCENT : FAINT);
  y = drawBar(y, "Livret A", sp(formatMoney(savings.savingsValue)), savings.savingsValue / benchMax, cryptoWins ? FAINT : ACCENT);
  y += 4;
  doc.setFont(REG, "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...FAINT);
  const benchTake = cryptoWins
    ? `Soit ${benchGap} de plus pour la crypto, en échange d'un risque nettement supérieur.`
    : `Soit ${benchGap} de plus pour le livret, et sans aucun risque.`;
  for (const line of doc.splitTextToSize(benchTake, contentW) as string[]) {
    doc.text(line, M, y);
    y += 12;
  }
  y += 18;

  if (!isLumpSum) {
    doc.setFont(SEMI, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("Progressivement ou tout d'un coup", M, y);
    y += 16;
    const dcaMax = Math.max(comparison.scheduled.finalValue, comparison.lumpSum.finalValue, 1);
    y = drawBar(y, "Étalé", sp(formatMoney(comparison.scheduled.finalValue)), comparison.scheduled.finalValue / dcaMax, comparison.winner === "scheduled" ? ACCENT : FAINT);
    y = drawBar(y, "En une fois", sp(formatMoney(comparison.lumpSum.finalValue)), comparison.lumpSum.finalValue / dcaMax, comparison.winner === "lumpSum" ? ACCENT : FAINT);
    y += 4;
    doc.setFont(REG, "normal");
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
  doc.line(M, pageH - 48, W - M, pageH - 48);
  doc.setFont(SEMI, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("S'investir Simulateurs", M, pageH - 32);
  doc.setFont(REG, "normal");
  doc.setTextColor(...FAINT);
  doc.text("Prix Binance  ·  À but pédagogique, pas un conseil en investissement.", W - M, pageH - 32, { align: "right" });

  return doc;
}

// Genere et telecharge le rapport. jsPDF est charge a la demande (import dynamique)
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