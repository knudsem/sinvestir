import type {
  SimulationResult,
  StrategyComparison,
  ContributionAnalysis,
  SavingsComparison,
  CoinSummary,
} from "../../core/index.js";
import { adjustForInflation } from "../../core/index.js";
import { PerformanceChart } from "./PerformanceChart.js";
import { formatMoney, formatPercent, formatPrice, formatMonthYear } from "../format.js";

// Hypothèse d'inflation annuelle pour exprimer les rendements en termes réels.
const INFLATION_RATE = 0.02;

interface Props {
  result: SimulationResult;
  comparison: StrategyComparison;
  analysis: ContributionAnalysis;
  savings: SavingsComparison;
  coin: CoinSummary | undefined;
}

export function Results({ result, comparison, analysis, savings, coin }: Props) {
  if (!result.hasData) {
    return (
      <div class="card">
        <div class="verdict">
          <p class="verdict-line">
            Aucune donnée disponible pour cette crypto sur la période choisie.
            Essayez une autre période.
          </p>
        </div>
      </div>
    );
  }

  const gainPositive = result.absoluteGain >= 0;
  const coinName = coin?.name ?? result.input.coinId;
  const isLumpSum = result.input.frequency === "once";
  const wasClamped = result.effectiveStartDate !== result.input.startDate;

  // Largeurs des barres DCA contre investissement unique.
  const maxFinal = Math.max(comparison.scheduled.finalValue, comparison.lumpSum.finalValue, 1);
  const dcaWidth = (comparison.scheduled.finalValue / maxFinal) * 100;
  const lumpWidth = (comparison.lumpSum.finalValue / maxFinal) * 100;
  const diff = Math.abs(comparison.difference);

  // Largeurs des barres crypto contre Livret A.
  const maxBench = Math.max(savings.cryptoValue, savings.savingsValue, 1);
  const cryptoWidth = (savings.cryptoValue / maxBench) * 100;
  const savingsWidth = (savings.savingsValue / maxBench) * 100;
  const cryptoWins = savings.difference >= 0;
  const ratePct = formatPercent(savings.rate, false);

  const inflation = adjustForInflation(
    result.finalValue,
    result.metrics.annualizedReturn,
    result.effectiveStartDate,
    result.effectiveEndDate,
    INFLATION_RATE
  );
  const startYear = result.effectiveStartDate.slice(0, 4);

  return (
    <div class="card">
      <div class="verdict">
        <p class="verdict-line">
          {isLumpSum ? (
            <>Un placement unique de <strong>{formatMoney(result.totalInvested)}</strong> sur le {coinName}</>
          ) : (
            <>
              <strong>{formatMoney(result.input.amount)}</strong> investis{" "}
              {labelForFrequency(result.input.frequency)} sur le {coinName}, soit{" "}
              <strong>{formatMoney(result.totalInvested)}</strong> au total
            </>
          )}{" "}
          de {formatMonthYear(result.effectiveStartDate)} à {formatMonthYear(result.effectiveEndDate)}
        </p>
        <div class="verdict-final tnum">
          <span>{formatMoney(result.finalValue)}</span>
          <span class={`delta ${gainPositive ? "up" : "down"}`}>
            {formatPercent(result.percentageGain)}
          </span>
        </div>
        <p class="clamp-note">
          Après une inflation de {formatPercent(inflation.rate, false)} par an, cela
          représente {formatMoney(inflation.realValue)} en euros de {startYear}, soit{" "}
          {formatPercent(inflation.realAnnualReturn)} par an en termes réels.
        </p>
        {wasClamped && (
          <p class="clamp-note">
            Données disponibles à partir de {formatMonthYear(result.effectiveStartDate)} pour
            cette crypto. La période demandée a été ajustée en conséquence.
          </p>
        )}
      </div>

      <div class="metrics">
        <Metric label="Total investi" value={formatMoney(result.totalInvested)} />
        <Metric
          label="Gain"
          value={formatMoney(result.absoluteGain)}
          tone={gainPositive ? "pos" : "neg"}
        />
        <Metric
          label="Rendement / an"
          value={formatPercent(result.metrics.annualizedReturn)}
          tone={result.metrics.annualizedReturn >= 0 ? "pos" : "neg"}
        />
        <Metric label="Prix d'achat moyen" value={formatPrice(result.metrics.averageBuyPrice)} />
        <Metric label="Pire baisse" value={formatPercent(-result.metrics.maxDrawdown, false)} tone="neg" />
        <Metric label="Volatilité / an" value={formatPercent(result.metrics.volatility, false)} />
        <Metric label="Temps en profit" value={formatPercent(result.metrics.timeInProfit, false)} />
        <Metric label="Sommet" value={formatMoney(result.metrics.peakValue)} />
        <Metric label="Apports" value={String(result.metrics.contributionCount)} />
      </div>

      <PerformanceChart timeline={result.timeline} />

      <div class="compare">
        <h3 class="compare-title">Crypto contre Livret A ({ratePct})</h3>
        <div class="bar-row">
          <span class="bar-name">{coinName}</span>
          <div class="bar-track">
            <div class={`bar-fill ${cryptoWins ? "win" : "lose"}`} style={`width:${cryptoWidth}%`}></div>
          </div>
          <span class="bar-val tnum">{formatMoney(savings.cryptoValue)}</span>
        </div>
        <div class="bar-row">
          <span class="bar-name">Livret A</span>
          <div class="bar-track">
            <div class={`bar-fill ${cryptoWins ? "lose" : "win"}`} style={`width:${savingsWidth}%`}></div>
          </div>
          <span class="bar-val tnum">{formatMoney(savings.savingsValue)}</span>
        </div>
        <p class="compare-note">{savingsNote(savings, ratePct)}</p>
      </div>

      {!isLumpSum && (
        <div class="compare">
          <h3 class="compare-title">Progressivement ou tout d'un coup ?</h3>
          <div class="bar-row">
            <span class="bar-name">Étalé</span>
            <div class="bar-track">
              <div
                class={`bar-fill ${comparison.winner === "scheduled" ? "win" : "lose"}`}
                style={`width:${dcaWidth}%`}
              ></div>
            </div>
            <span class="bar-val tnum">{formatMoney(comparison.scheduled.finalValue)}</span>
          </div>
          <div class="bar-row">
            <span class="bar-name">En une fois</span>
            <div class="bar-track">
              <div
                class={`bar-fill ${comparison.winner === "lumpSum" ? "win" : "lose"}`}
                style={`width:${lumpWidth}%`}
              ></div>
            </div>
            <span class="bar-val tnum">{formatMoney(comparison.lumpSum.finalValue)}</span>
          </div>
          <p class="compare-note">{comparisonNote(comparison, diff)}</p>
          {analysis.best && analysis.worst && (
            <p class="compare-note">
              Meilleur achat : <strong>{formatMonthYear(analysis.best.date)}</strong> à{" "}
              {formatPercent(analysis.best.returnRatio)}. Pire achat :{" "}
              {formatMonthYear(analysis.worst.date)} à {formatPercent(analysis.worst.returnRatio)}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div class="metric">
      <div class="metric-label">{label}</div>
      <div class={`metric-value tnum ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function labelForFrequency(frequency: string): string {
  if (frequency === "daily") return "chaque jour";
  if (frequency === "weekly") return "chaque semaine";
  if (frequency === "monthly") return "chaque mois";
  return "";
}

function comparisonNote(comparison: StrategyComparison, diff: number): string {
  if (comparison.winner === "tie") {
    return "Les deux approches donnent le même résultat sur cette période.";
  }
  if (comparison.winner === "scheduled") {
    return `A capital égal, étaler vos achats aurait rapporté ${formatMoney(diff)} de plus que tout investir au départ.`;
  }
  return `A capital égal, tout investir au départ aurait rapporté ${formatMoney(diff)} de plus qu'étaler vos achats.`;
}

function savingsNote(savings: SavingsComparison, ratePct: string): string {
  const gap = Math.abs(savings.difference);
  if (savings.difference >= 0) {
    return `Pour le même capital, votre stratégie crypto a rapporté ${formatMoney(gap)} de plus qu'un Livret A à ${ratePct} par an, en échange d'un risque nettement supérieur.`;
  }
  return `Pour le même capital, un Livret A à ${ratePct} par an aurait rapporté ${formatMoney(gap)} de plus que votre stratégie crypto, et sans risque.`;
}
