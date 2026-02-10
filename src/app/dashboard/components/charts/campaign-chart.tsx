"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CampaignData {
  name: string;
  spend: number;
  revenue: number;
  roas: number;
}

interface CampaignChartProps {
  data: CampaignData[];
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{entry.name}:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {entry.name === "ROAS" ? `${entry.value.toFixed(2)}x` : fmtCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function roasColor(roas: number): string {
  if (roas >= 2) return "var(--status-positive)";
  if (roas >= 1) return "var(--status-warning)";
  return "var(--status-negative)";
}

export function CampaignChart({ data }: CampaignChartProps) {
  const sorted = [...data].sort((a, b) => b.spend - a.spend).slice(0, 8);
  const chartData = sorted.map((d) => ({ ...d, name: truncate(d.name, 10) }));

  if (chartData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Spend vs Revenue */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Spend vs Revenue
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              axisLine={{ stroke: "var(--border-secondary)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              tickFormatter={fmtCurrency}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-secondary)", opacity: 0.5 }} />
            <Bar dataKey="spend" name="Spend" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--status-positive)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROAS by Campaign */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          ROAS by Campaign
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              axisLine={{ stroke: "var(--border-secondary)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toFixed(1)}x`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-secondary)", opacity: 0.5 }} />
            <Bar dataKey="roas" name="ROAS" radius={[4, 4, 0, 0]} fillOpacity={0.8}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={roasColor(entry.roas)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
