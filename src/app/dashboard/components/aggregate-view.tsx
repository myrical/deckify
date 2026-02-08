"use client";

import { MetricCard } from "./metric-card";

interface AggregateData {
  totalAdSpend: number;
  totalRevenue: number;
  blendedRoas: number;
  mer: number;
  totalConversions: number;
  totalOrders: number;
  metaSpend: number;
  googleSpend: number;
  metaConversions: number;
  googleConversions: number;
  previousPeriod?: {
    totalAdSpend: number;
    totalRevenue: number;
    blendedRoas: number;
    totalConversions: number;
    totalOrders: number;
  };
}

function pctChange(current: number, previous?: number): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function trend(change?: number): "up" | "down" | "flat" | undefined {
  if (change === undefined) return undefined;
  return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";
}

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AggregateView({ data }: { data?: AggregateData }) {
  if (!data) {
    return (
      <div
        className="flex items-center justify-center rounded-xl py-16"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, var(--accent-primary-light), rgba(236, 72, 153, 0.08))" }}
          >
            <svg viewBox="0 0 20 20" fill="var(--accent-primary)" className="h-6 w-6">
              <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.5v.5h4v-.5c0-1.057.763-2 1.815-2.869A6 6 0 0 0 10 1Zm-1 15h2v1a1 1 0 1 1-2 0v-1Z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Connect your ad accounts and Shopify store
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            to see aggregated performance data
          </p>
        </div>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total Ad Spend" value={fmt(data.totalAdSpend)} change={pctChange(data.totalAdSpend, prev?.totalAdSpend)} trend={trend(pctChange(data.totalAdSpend, prev?.totalAdSpend))} size="md" />
        <MetricCard label="Shopify Revenue" value={fmt(data.totalRevenue)} change={pctChange(data.totalRevenue, prev?.totalRevenue)} trend={trend(pctChange(data.totalRevenue, prev?.totalRevenue))} size="md" />
        <MetricCard label="Blended ROAS" value={`${data.blendedRoas.toFixed(2)}x`} change={pctChange(data.blendedRoas, prev?.blendedRoas)} trend={trend(pctChange(data.blendedRoas, prev?.blendedRoas))} size="md" />
        <MetricCard label="MER" value={`${data.mer.toFixed(2)}x`} size="md" />
        <MetricCard label="Total Conversions" value={data.totalConversions.toLocaleString()} change={pctChange(data.totalConversions, prev?.totalConversions)} trend={trend(pctChange(data.totalConversions, prev?.totalConversions))} size="md" />
        <MetricCard label="Shopify Orders" value={data.totalOrders.toLocaleString()} change={pctChange(data.totalOrders, prev?.totalOrders)} trend={trend(pctChange(data.totalOrders, prev?.totalOrders))} size="md" />
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Spend by Channel
        </h3>
        <div className="space-y-3">
          {[
            { name: "Meta Ads", spend: data.metaSpend, conversions: data.metaConversions, color: "#1877F2" },
            { name: "Google Ads", spend: data.googleSpend, conversions: data.googleConversions, color: "#4285F4" },
          ]
            .filter((ch) => ch.spend > 0)
            .map((channel) => {
              const pct = data.totalAdSpend > 0 ? (channel.spend / data.totalAdSpend) * 100 : 0;
              return (
                <div key={channel.name} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{channel.name}</div>
                  <div className="flex-1">
                    <div className="h-7 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-tertiary)" }}>
                      <div
                        className="flex h-full items-center rounded-full px-3 text-xs font-semibold text-white transition-all duration-700"
                        style={{ width: `${Math.max(pct, 8)}%`, background: channel.color }}
                      >
                        {pct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(channel.spend)}</div>
                  <div className="w-20 text-right text-xs" style={{ color: "var(--text-tertiary)" }}>{channel.conversions.toLocaleString()} conv.</div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue vs Ad Spend (Daily)</h3>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Chart will render with actual time series data when accounts are connected.</p>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Line chart: Shopify revenue vs Meta + Google spend</span>
        </div>
      </div>
    </div>
  );
}
