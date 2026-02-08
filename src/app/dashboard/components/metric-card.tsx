"use client";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "flat";
  size?: "sm" | "md" | "lg";
}

export function MetricCard({ label, value, change, trend, size = "md" }: MetricCardProps) {
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
        className={`mt-1.5 font-bold ${
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
              background:
                trend === "up"
                  ? "var(--status-positive-light)"
                  : trend === "down"
                    ? "var(--status-negative-light)"
                    : "var(--bg-tertiary)",
              color:
                trend === "up"
                  ? "var(--status-positive)"
                  : trend === "down"
                    ? "var(--status-negative)"
                    : "var(--text-tertiary)",
            }}
          >
            {trend === "up" ? "\u25B2" : trend === "down" ? "\u25BC" : "\u25CF"}
          </span>
          <span
            className="text-xs font-medium"
            style={{
              color:
                trend === "up"
                  ? "var(--status-positive)"
                  : trend === "down"
                    ? "var(--status-negative)"
                    : "var(--text-tertiary)",
            }}
          >
            {Math.abs(change).toFixed(1)}% vs prev.
          </span>
        </div>
      )}
    </div>
  );
}
