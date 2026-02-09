"use client";

type MetricType = "revenue" | "spend" | "roas" | "purchases" | "ctr" | "cpc" | "cpm" | "cpa" | "neutral";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "flat";
  size?: "sm" | "md" | "lg";
  metricType?: MetricType;
}

const POSITIVE_METRICS: MetricType[] = ["revenue", "roas", "purchases", "ctr"];
const NEGATIVE_METRICS: MetricType[] = ["cpc", "cpa", "cpm"];

function getSentimentColor(trend: "up" | "down" | "flat" | undefined, metricType: MetricType): string {
  if (!trend || trend === "flat") return "var(--text-tertiary)";
  if (metricType === "neutral" || metricType === "spend") return "var(--text-tertiary)";

  const isPositiveDirection = trend === "up";
  const isPositiveMetric = POSITIVE_METRICS.includes(metricType);
  const isNegativeMetric = NEGATIVE_METRICS.includes(metricType);

  if (isPositiveMetric) {
    return isPositiveDirection ? "var(--status-positive)" : "var(--status-negative)";
  }
  if (isNegativeMetric) {
    // For cost metrics, going up is bad, going down is good
    return isPositiveDirection ? "var(--status-negative)" : "var(--status-positive)";
  }
  return "var(--text-tertiary)";
}

function getSentimentBg(trend: "up" | "down" | "flat" | undefined, metricType: MetricType): string {
  if (!trend || trend === "flat") return "var(--bg-tertiary)";
  if (metricType === "neutral" || metricType === "spend") return "var(--bg-tertiary)";

  const isPositiveDirection = trend === "up";
  const isPositiveMetric = POSITIVE_METRICS.includes(metricType);
  const isNegativeMetric = NEGATIVE_METRICS.includes(metricType);

  if (isPositiveMetric) {
    return isPositiveDirection ? "var(--status-positive-light)" : "var(--status-negative-light)";
  }
  if (isNegativeMetric) {
    return isPositiveDirection ? "var(--status-negative-light)" : "var(--status-positive-light)";
  }
  return "var(--bg-tertiary)";
}

export function MetricCard({ label, value, change, trend, size = "md", metricType = "neutral" }: MetricCardProps) {
  const sentimentColor = getSentimentColor(trend, metricType);
  const sentimentBg = getSentimentBg(trend, metricType);

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
        className={`mt-1.5 font-extrabold font-mono ${
          size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-xl"
        }`}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
            style={{
              background: sentimentBg,
              color: sentimentColor,
            }}
          >
            {trend === "up" ? "\u25B2" : trend === "down" ? "\u25BC" : "\u2014"}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: sentimentColor }}
          >
            {Math.abs(change).toFixed(1)}% vs prev.
          </span>
        </div>
      )}
    </div>
  );
}
