"use client";

import { TimeSeriesChart } from "./charts/time-series-chart";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AllPlatformsViewData {
  totalSpend: number;
  totalRevenue: number;
  mer: number; // (totalSpend / totalRevenue) * 100 — expressed as a percentage
  roas: number;
  platforms: {
    meta?: { spend: number; revenue: number; conversions: number; roas: number };
    google?: { spend: number; revenue: number; conversions: number; roas: number };
    shopify?: { revenue: number; orders: number };
  };
  previousPeriod?: {
    totalSpend: number;
    totalRevenue: number;
    mer: number;
    roas: number;
  };
  timeSeries: Array<{ date: string; spend: number; revenue: number }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  shopify: "Shopify",
};

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(2);
}

function fmtCompactLg(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pctChange(current: number, previous?: number): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

/* ------------------------------------------------------------------ */
/*  Platform icon                                                      */
/* ------------------------------------------------------------------ */

function PlatformIcon({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? "var(--text-tertiary)";
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white"
      style={{ background: color }}
    >
      {platform.charAt(0).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AllPlatformsView({ data }: { data?: AllPlatformsViewData }) {
  if (!data) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No analytics data available for this client.
        </p>
      </div>
    );
  }

  const prev = data.previousPeriod;

  /* ---- Build platform rows for the breakdown ---- */
  const adPlatforms: Array<{
    key: string;
    label: string;
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
  }> = [];

  if (data.platforms.meta) {
    adPlatforms.push({
      key: "meta",
      label: PLATFORM_LABELS.meta,
      spend: data.platforms.meta.spend,
      revenue: data.platforms.meta.revenue,
      roas: data.platforms.meta.roas,
      conversions: data.platforms.meta.conversions,
    });
  }
  if (data.platforms.google) {
    adPlatforms.push({
      key: "google",
      label: PLATFORM_LABELS.google,
      spend: data.platforms.google.spend,
      revenue: data.platforms.google.revenue,
      roas: data.platforms.google.roas,
      conversions: data.platforms.google.conversions,
    });
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
      >
        <h2 className="mb-5 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Blended Performance
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {/* MER */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              MER
            </p>
            <p
              className="mt-1 text-3xl font-semibold font-mono tracking-tight"
              style={{ color: "var(--accent-primary)" }}
            >
              {data.mer > 0 ? data.mer.toFixed(1) + "%" : "--"}
            </p>
            {(() => {
              const change = pctChange(data.mer, prev?.mer);
              if (change === undefined) return null;
              // MER: lower is better, so increase = negative sentiment
              const isGood = change < 0;
              return (
                <p className="mt-1 text-xs font-medium" style={{ color: isGood ? "var(--status-positive)" : "var(--status-negative)" }}>
                  {change > 0 ? "▲" : "▼"} {change > 0 ? "+" : ""}{change.toFixed(1)}% vs prev
                </p>
              );
            })()}
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Spend ÷ Revenue
            </p>
          </div>

          {/* ROAS */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              ROAS
            </p>
            <p
              className="mt-1 text-3xl font-semibold font-mono tracking-tight"
              style={{ color: "var(--accent-secondary, #3b82f6)" }}
            >
              {data.roas > 0 ? data.roas.toFixed(2) + "x" : "--"}
            </p>
            {(() => {
              const change = pctChange(data.roas, prev?.roas);
              if (change === undefined) return null;
              const isGood = change > 0;
              return (
                <p className="mt-1 text-xs font-medium" style={{ color: isGood ? "var(--status-positive)" : "var(--status-negative)" }}>
                  {change > 0 ? "▲" : "▼"} {change > 0 ? "+" : ""}{change.toFixed(1)}% vs prev
                </p>
              );
            })()}
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Revenue ÷ Spend
            </p>
          </div>

          {/* Total Revenue */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Total Revenue
            </p>
            <p
              className="mt-1 text-3xl font-semibold font-mono tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {fmtCompactLg(data.totalRevenue)}
            </p>
            {(() => {
              const change = pctChange(data.totalRevenue, prev?.totalRevenue);
              if (change === undefined) return null;
              const isGood = change > 0;
              return (
                <p className="mt-1 text-xs font-medium" style={{ color: isGood ? "var(--status-positive)" : "var(--status-negative)" }}>
                  {change > 0 ? "▲" : "▼"} {change > 0 ? "+" : ""}{change.toFixed(1)}% vs prev
                </p>
              );
            })()}
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {data.platforms.shopify ? "Shopify" : "Ad Platforms"}
            </p>
          </div>

          {/* Total Ad Spend */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Total Ad Spend
            </p>
            <p
              className="mt-1 text-3xl font-semibold font-mono tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {fmtCompactLg(data.totalSpend)}
            </p>
            {(() => {
              const change = pctChange(data.totalSpend, prev?.totalSpend);
              if (change === undefined) return null;
              return (
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {change > 0 ? "▲" : "▼"} {change > 0 ? "+" : ""}{change.toFixed(1)}% vs prev
                </p>
              );
            })()}
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {[data.platforms.meta && "Meta", data.platforms.google && "Google"].filter(Boolean).join(" + ")}
            </p>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {(adPlatforms.length > 0 || data.platforms.shopify) && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${adPlatforms.length + (data.platforms.shopify ? 1 : 0)}, 1fr)` }}
        >
          {adPlatforms.map((p) => (
            <div
              key={p.key}
              className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                borderTop: `3px solid ${PLATFORM_COLORS[p.key] ?? "var(--accent-primary)"}`,
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <PlatformIcon platform={p.key} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {p.label}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Spend</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {fmtCompact(p.spend)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Revenue</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {fmtCompact(p.revenue)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>ROAS</span>
                  <span
                    className="text-sm font-semibold font-mono"
                    style={{ color: p.roas >= 2 ? "var(--status-positive)" : p.roas >= 1 ? "var(--status-warning, #f59e0b)" : "var(--status-negative)" }}
                  >
                    {p.roas.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Conv.</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {p.conversions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Shopify card */}
          {data.platforms.shopify && (
            <div
              className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                borderTop: `3px solid ${PLATFORM_COLORS.shopify}`,
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <PlatformIcon platform="shopify" />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {PLATFORM_LABELS.shopify}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Revenue</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {fmtCompact(data.platforms.shopify.revenue)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Orders</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {data.platforms.shopify.orders.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Trend Chart */}
      {data.timeSeries.length > 0 && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <h3
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Performance Trend
            </h3>
          </div>
          <div className="p-6">
            <TimeSeriesChart
              data={data.timeSeries}
              metrics={[
                { key: "spend", label: "Ad Spend", color: "var(--accent-primary)", type: "bar", yAxisId: "left" },
                { key: "revenue", label: "Revenue", color: "var(--status-positive)", type: "line", yAxisId: "right" },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
