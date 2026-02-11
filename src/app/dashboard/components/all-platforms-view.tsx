"use client";

import { MetricCard } from "./metric-card";
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

function fmt(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtWhole(n: number): string {
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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
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

  const maxSpend = Math.max(...adPlatforms.map((p) => p.spend), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="MER"
          value={data.mer > 0 ? data.mer.toFixed(1) + "%" : "--"}
          change={pctChange(data.mer, prev?.mer)}
          metricType="negative-up"
          size="md"
        />
        <MetricCard
          label="ROAS"
          value={data.roas > 0 ? data.roas.toFixed(2) + "x" : "--"}
          change={pctChange(data.roas, prev?.roas)}
          metricType="positive-up"
          size="md"
        />
        <MetricCard
          label="Total Revenue"
          value={fmtWhole(data.totalRevenue)}
          change={pctChange(data.totalRevenue, prev?.totalRevenue)}
          metricType="positive-up"
          size="md"
        />
        <MetricCard
          label="Total Ad Spend"
          value={fmtWhole(data.totalSpend)}
          change={pctChange(data.totalSpend, prev?.totalSpend)}
          metricType="neutral"
          size="md"
        />
      </div>

      {/* Platform Breakdown */}
      {(adPlatforms.length > 0 || data.platforms.shopify) && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-primary)" }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Platform Breakdown
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
            {adPlatforms.map((p) => (
              <div key={p.key} className="flex items-center gap-4 px-6 py-4">
                <PlatformIcon platform={p.key} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {p.label}
                  </p>
                  <div className="mt-1.5 flex items-center gap-4">
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Spend </span>
                      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                        {fmt(p.spend)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Revenue </span>
                      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                        {fmt(p.revenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>ROAS </span>
                      <span
                        className="text-xs font-bold font-mono"
                        style={{ color: p.roas >= 2 ? "var(--status-positive)" : p.roas >= 1 ? "var(--status-warning, #f59e0b)" : "var(--status-negative)" }}
                      >
                        {p.roas.toFixed(2)}x
                      </span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Conv. </span>
                      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                        {p.conversions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Spend bar */}
                <div className="hidden w-32 sm:block">
                  <div
                    className="h-2 rounded-full"
                    style={{ background: "var(--bg-tertiary, var(--bg-secondary))" }}
                  >
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((p.spend / maxSpend) * 100, 100)}%`,
                        background: PLATFORM_COLORS[p.key] ?? "var(--accent-primary)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Shopify row (e-commerce, not an ad platform) */}
            {data.platforms.shopify && (
              <div className="flex items-center gap-4 px-6 py-4">
                <PlatformIcon platform="shopify" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {PLATFORM_LABELS.shopify}
                  </p>
                  <div className="mt-1.5 flex items-center gap-4">
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Revenue </span>
                      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                        {fmt(data.platforms.shopify.revenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Orders </span>
                      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                        {data.platforms.shopify.orders.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              className="text-sm font-semibold uppercase tracking-wider"
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
