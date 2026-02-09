"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface CampaignData {
  name: string;
  spend: number;
  revenue: number;
  roas: number;
}

function fmtCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${n.toFixed(0)}`;
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + "..." : s;
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
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.name === "ROAS" ? `${entry.value.toFixed(2)}x` : fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function CampaignChart({ campaigns }: { campaigns: CampaignData[] }) {
  if (campaigns.length < 2) return null;

  const data = campaigns.slice(0, 10).map((c) => ({
    ...c,
    shortName: truncate(c.name, 12),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Spend vs Revenue */}
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
          Spend vs Revenue
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
            <XAxis
              dataKey="shortName"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={50}
              axisLine={{ stroke: "var(--border-secondary)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtCurrency}
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="spend" name="Spend" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--status-positive)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROAS by Campaign */}
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
          ROAS by Campaign
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
            <XAxis
              dataKey="shortName"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={50}
              axisLine={{ stroke: "var(--border-secondary)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(1)}x`}
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="roas"
              name="ROAS"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.85}
              fill="var(--accent-secondary)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
