import { useId } from "react";
import type { Trend } from "@/lib/brief/format";
import { cn } from "@/lib/utils";

const COLOR: Record<Trend, string> = { up: "var(--up)", down: "var(--down)", flat: "var(--flat)" };

interface SparklineProps {
  values: number[];
  trend: Trend;
  className?: string;
  /** Description lue par les lecteurs d'écran. */
  label: string;
}

/** Mini-courbe des dernières clôtures, verte ou rouge selon la tendance. */
export function Sparkline({ values, trend, className, label }: SparklineProps) {
  const id = useId();
  const W = 100;
  const H = 36;
  const PAD = 3;
  if (values.length < 2) return <div className={cn("h-9", className)} aria-hidden />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => [
    PAD + (i / (values.length - 1)) * (W - PAD * 2),
    PAD + (1 - (v - min) / span) * (H - PAD * 2),
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points.at(-1)!;
  const color = COLOR[trend];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-9 w-24 overflow-visible", className)} role="img" aria-label={label} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${lastX} ${H} L${PAD} ${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} />
    </svg>
  );
}
