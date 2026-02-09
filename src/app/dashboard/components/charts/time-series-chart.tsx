"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface TimeSeriesPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
}

function fmtCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        color: "var(--text-primary)",
      }}
    >
      <p className="mb-1 font-medium">{label ? fmtDate(label) : ""}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.name === "ROAS" ? `${entry.value.toFixed(2)}x` : fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function TimeSeriesChart({ timeSeries, title }: { timeSeries: TimeSeriesPoint[]; title?: string }) {
  if (timeSeries.length < 2) return null;

  const data = timeSeries.map((ts) => ({
    ...ts,
    displayDate: fmtDate(ts.date),
  }));

  return (
    <div
      className="overflow-hidden rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <h3
        className="mb-4 text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title ?? "Daily Performance"}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border-secondary)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtCurrency}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-tertiary)" }}
          />
          <Bar
            yAxisId="left"
            dataKey="spend"
            name="Spend"
            fill="var(--accent-primary)"
            radius={[3, 3, 0, 0]}
            fillOpacity={0.7}
            barSize={14}
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Revenue"
            fill="var(--status-positive)"
            radius={[3, 3, 0, 0]}
            fillOpacity={0.7}
            barSize={14}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="roas"
            name="ROAS"
            stroke="var(--accent-secondary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent-secondary)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface EcommerceTimeSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export function EcommerceTimeSeriesChart({ timeSeries }: { timeSeries: EcommerceTimeSeriesPoint[] }) {
  if (timeSeries.length < 2) return null;

  return (
    <div
      className="overflow-hidden rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <h3
        className="mb-4 text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        Daily Revenue &amp; Orders
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={timeSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border-secondary)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtCurrency}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div
                className="rounded-lg px-3 py-2 text-xs shadow-md"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <p className="mb-1 font-medium">{label ? fmtDate(label as string) : ""}</p>
                {payload.map((entry, i) => (
                  <p key={i} style={{ color: entry.color as string }}>
                    {entry.name}: {entry.name === "Orders" ? entry.value : fmtCurrency(entry.value as number)}
                  </p>
                ))}
              </div>
            );
          }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-tertiary)" }} />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Revenue"
            fill="var(--status-positive)"
            radius={[3, 3, 0, 0]}
            fillOpacity={0.7}
            barSize={18}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent-primary)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
