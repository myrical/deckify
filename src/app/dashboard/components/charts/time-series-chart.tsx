"use client";

import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  type: "line" | "bar" | "area";
  yAxisId?: "left" | "right";
}

interface TimeSeriesChartProps {
  data: Array<Record<string, number | string>>;
  metrics: MetricConfig[];
  height?: number;
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>
        {label ? fmtDate(label) : ""}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{entry.name}:</span>
          <span className="font-medium font-mono" style={{ color: "var(--text-primary)" }}>
            {typeof entry.value === "number"
              ? entry.value >= 100
                ? fmtCurrency(entry.value)
                : entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 pb-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TimeSeriesChart({ data, metrics, height = 280 }: TimeSeriesChartProps) {
  if (!data.length) return null;

  const hasRightAxis = metrics.some((m) => m.yAxisId === "right");
  // Determine if left axis is currency-based
  const leftMetrics = metrics.filter((m) => !m.yAxisId || m.yAxisId === "left");
  const leftIsCurrency = leftMetrics.some((m) =>
    ["spend", "revenue", "cost"].some((k) => m.key.toLowerCase().includes(k))
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <defs>
          {metrics
            .filter((m) => m.type === "area")
            .map((m) => (
              <linearGradient key={m.key} id={`gradient-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          tickFormatter={fmtDate}
          interval="preserveStartEnd"
          axisLine={{ stroke: "var(--border-secondary)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          tickFormatter={leftIsCurrency ? fmtCurrency : fmtNumber}
          axisLine={false}
          tickLine={false}
        />
        {hasRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickFormatter={fmtNumber}
            axisLine={false}
            tickLine={false}
          />
        )}
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-primary)", strokeDasharray: "3 3" }} />
        <Legend content={<CustomLegend />} />
        {metrics.map((m) => {
          const yAxisId = m.yAxisId ?? "left";
          if (m.type === "bar") {
            return (
              <Bar
                key={m.key}
                dataKey={m.key}
                name={m.label}
                fill={m.color}
                yAxisId={yAxisId}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.8}
              />
            );
          }
          if (m.type === "area") {
            return (
              <Area
                key={m.key}
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                fill={`url(#gradient-${m.key})`}
                yAxisId={yAxisId}
                type="monotone"
                strokeWidth={2}
              />
            );
          }
          return (
            <Line
              key={m.key}
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              yAxisId={yAxisId}
              type="monotone"
              strokeWidth={2}
              dot={{ r: 3, fill: m.color }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
