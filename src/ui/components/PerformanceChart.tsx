import { useRef, useState } from "preact/hooks";
import type { TimelinePoint } from "../../core/index.js";
import { formatMoney, formatMonthYear, formatDate } from "../format.js";

interface Props {
  timeline: TimelinePoint[];
}

const W = 720;
const H = 320;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

// Réduit le nombre de points pour garder un chemin SVG leger sans changer la
// forme de la courbe.
function sample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i += 1) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

// Graphique surface plus ligne, dessine entièrement en SVG (aucune dépendance).
// La ligne d'accent porte la valeur du portefeuille, la ligne pointillee le
// montant investi cumule. Au survol, un curseur et une infobulle montrent les
// chiffres exacts du jour pointe.
export function PerformanceChart({ timeline }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (timeline.length < 2) {
    return (
      <div class="chart-wrap">
        <p class="hint">Pas assez de données pour tracer la courbe sur cette période.</p>
      </div>
    );
  }

  const points = sample(timeline, 360);
  const n = points.length;

  const maxValue = Math.max(
    ...points.map((p) => p.value),
    ...points.map((p) => p.invested)
  );
  const yMax = maxValue * 1.08 || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const lineFor = (get: (p: TimelinePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(get(p)).toFixed(1)}`).join(" ");

  const valueLine = lineFor((p) => p.value);
  const investedLine = lineFor((p) => p.invested);
  const baseline = PAD.top + innerH;
  const area = `${valueLine} L${x(n - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`;

  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_, k) => {
    const v = (yMax / ticks) * k;
    return { v, yPos: y(v) };
  });

  function handleMoveX(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((svgX - PAD.left) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  // Géométrie de l'infobulle au survol.
  const hovered = hover !== null ? points[hover] : null;
  const hx = hover !== null ? x(hover) : 0;
  const hyValue = hovered ? y(hovered.value) : 0;
  const tipW = 150;
  const tipH = 64;
  const tipX = hx > W - tipW - 20 ? hx - tipW - 12 : hx + 12;
  const tipY = Math.max(PAD.top, Math.min(hyValue - tipH / 2, H - PAD.bottom - tipH));

  return (
    <div class="chart-wrap">
      <div class="chart-head">
        <div class="legend">
          <span><i class="swatch value"></i>Valeur du portefeuille</span>
          <span><i class="swatch invested"></i>Investi cumule</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        class="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={(e) => handleMoveX(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleMoveX(t.clientX);
        }}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={g.yPos} y2={g.yPos} stroke="var(--border)" stroke-width="1" />
            <text x={PAD.left - 10} y={g.yPos + 4} text-anchor="end" class="tip-label">
              {formatMoney(g.v)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#valueFill)" />
        <path d={investedLine} fill="none" stroke="var(--invested)" stroke-width="1.6" stroke-dasharray="4 4" />
        <path d={valueLine} fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />

        <text x={PAD.left} y={H - 8} text-anchor="start" class="tip-label">
          {formatMonthYear(points[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 8} text-anchor="end" class="tip-label">
          {formatMonthYear(points[n - 1].date)}
        </text>

        {hovered && (
          <g>
            <line x1={hx} x2={hx} y1={PAD.top} y2={baseline} stroke="var(--border-strong)" stroke-width="1" />
            <circle cx={hx} cy={y(hovered.invested)} r="3" fill="var(--invested)" />
            <circle cx={hx} cy={hyValue} r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5" />
            <g transform={`translate(${tipX}, ${tipY})`}>
              <rect width={tipW} height={tipH} rx="8" fill="var(--surface-3)" stroke="var(--border-strong)" />
              <text x="12" y="20" class="tip-date">{formatDate(hovered.date)}</text>
              <text x="12" y="38" class="tip-value">Valeur {formatMoney(hovered.value)}</text>
              <text x="12" y="54" class="tip-invested">Investi {formatMoney(hovered.invested)}</text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
