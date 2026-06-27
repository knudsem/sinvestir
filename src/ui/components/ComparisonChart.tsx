import type { TimelinePoint } from "../../core/index.js";
import { formatMoney, formatMonthYear } from "../format.js";

export interface ComparisonSeries {
  coinId: string;
  name: string;
  color: string;
  points: TimelinePoint[];
}

const W = 720;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

function ms(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoOf(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function sample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i += 1) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

// Graphique multi-lignes alignees par date : chaque crypto a sa propre courbe de
// valeur de portefeuille, sur un axe temporel commun (les actifs cotés plus tard
// démarrent simplement plus à droite).
export function ComparisonChart({ series }: { series: ComparisonSeries[] }) {
  const withData = series.filter((s) => s.points.length > 1);
  if (withData.length === 0) {
    return <p class="hint">Aucune donnée à comparer sur cette période.</p>;
  }

  let minMs = Infinity;
  let maxMs = -Infinity;
  let maxVal = 0;
  for (const s of withData) {
    for (const p of s.points) {
      const m = ms(p.date);
      if (m < minMs) minMs = m;
      if (m > maxMs) maxMs = m;
      if (p.value > maxVal) maxVal = p.value;
    }
  }
  const yMax = maxVal * 1.08 || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (m: number) => PAD.left + (maxMs === minMs ? 0 : (m - minMs) / (maxMs - minMs)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const ticks = 4;

  return (
    <svg class="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style="cursor:default">
      {Array.from({ length: ticks + 1 }, (_, k) => {
        const v = (yMax / ticks) * k;
        const yp = y(v);
        return (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={yp} y2={yp} stroke="var(--border)" stroke-width="1" />
            <text x={PAD.left - 10} y={yp + 4} text-anchor="end" class="tip-label">
              {formatMoney(v)}
            </text>
          </g>
        );
      })}

      {withData.map((s) => {
        const pts = sample(s.points, 200);
        const d = pts
          .map((p, i) => `${i === 0 ? "M" : "L"}${x(ms(p.date)).toFixed(1)},${y(p.value).toFixed(1)}`)
          .join(" ");
        return <path d={d} fill="none" stroke={s.color} stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />;
      })}

      <text x={PAD.left} y={H - 8} text-anchor="start" class="tip-label">{formatMonthYear(isoOf(minMs))}</text>
      <text x={W - PAD.right} y={H - 8} text-anchor="end" class="tip-label">{formatMonthYear(isoOf(maxMs))}</text>
    </svg>
  );
}
