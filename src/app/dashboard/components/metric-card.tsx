"use client";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "flat";
  size?: "sm" | "md" | "lg";
  /** Sentiment-aware coloring: positive-up = increase is good, negative-up = increase is bad, neutral = always gray */
  metricType?: "positive-up" | "negative-up" | "neutral";
}

function resolveTrend(
  change: number | undefined,
  trend: "up" | "down" | "flat" | undefined,
  metricType: "positive-up" | "negative-up" | "neutral" | undefined,
): { direction: "up" | "down" | "flat"; sentiment: "positive" | "negative" | "neutral" } | undefined {
  if (change === undefined) return undefined;

  const direction = change > 0.5 ? "up" as const : change < -0.5 ? "down" as const : "flat" as const;

  if (!metricType) {
    // Legacy behavior: use trend prop directly for color
    const t = trend ?? direction;
    return { direction: t, sentiment: t === "up" ? "positive" : t === "down" ? "negative" : "neutral" };
  }

  if (metricType === "neutral" || direction === "flat") {
    return { direction, sentiment: "neutral" };
  }

  if (metricType === "positive-up") {
    return { direction, sentiment: direction === "up" ? "positive" : "negative" };
  }

  // negative-up: increase is bad
  return { direction, sentiment: direction === "up" ? "negative" : "positive" };
}

export function MetricCard({ label, value, change, trend, size = "md", metricType }: MetricCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Subtle gradient accent on top */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}
      />

      <p
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 font-bold font-mono ${
          size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-xl"
        }`}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {(() => {
        const resolved = resolveTrend(change, trend, metricType);
        if (!resolved || change === undefined) return null;
        const { direction, sentiment } = resolved;
        const bgColor = sentiment === "positive" ? "var(--status-positive-light)" : sentiment === "negative" ? "var(--status-negative-light)" : "var(--bg-tertiary)";
        const fgColor = sentiment === "positive" ? "var(--status-positive)" : sentiment === "negative" ? "var(--status-negative)" : "var(--text-tertiary)";
        const arrow = direction === "up" ? "\u25B2" : direction === "down" ? "\u25BC" : "\u25CF";
        return (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
              style={{ background: bgColor, color: fgColor }}
            >
              {arrow}
            </span>
            <span className="text-xs font-medium" style={{ color: fgColor }}>
              {Math.abs(change).toFixed(1)}% vs prev.
            </span>
          </div>
        );
      })()}
    </div>
  );
}
