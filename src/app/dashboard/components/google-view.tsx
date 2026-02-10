"use client";

import { MetricCard } from "./metric-card";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface KeywordRow { keyword: string; matchType: string; clicks: number; impressions: number; ctr: number; cpc: number; conversions: number; costPerConversion: number; }

interface GoogleViewData {
  accountName: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; type: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adGroups: Array<{ id: string; name: string; spend: number; clicks: number; conversions: number; cpa: number; }>; }>;
  keywords: KeywordRow[];
  previousPeriod?: { spend: number; conversions: number; roas: number; cpa: number; };
  timeSeries?: Array<{ date: string; metrics: Record<string, number> }>;
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function roasColor(roas: number): string {
  if (roas >= 2) return "var(--status-positive)";
  if (roas >= 1) return "var(--status-warning)";
  return "var(--status-negative)";
}

export function GoogleView({ data }: { data?: GoogleViewData }) {
  if (!data) return null;

  const prev = data.previousPeriod;

  const timeSeriesData = (data.timeSeries ?? []).map((ts) => ({
    date: ts.date,
    spend: ts.metrics?.spend ?? 0,
    clicks: ts.metrics?.clicks ?? 0,
    conversions: ts.metrics?.conversions ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Grid: 4 primary + 4 secondary */}
      <div className="space-y-4">
        <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Spend" value={fmt(data.spend)} change={pctChange(data.spend, prev?.spend)} metricType="neutral" size="md" />
          <MetricCard label="Revenue" value={fmt(data.revenue ?? 0)} metricType="positive-up" size="md" />
          <MetricCard label="ROAS" value={data.roas.toFixed(2) + "x"} change={pctChange(data.roas, prev?.roas)} metricType="positive-up" size="md" />
          <MetricCard label="Conversions" value={data.conversions.toLocaleString()} change={pctChange(data.conversions, prev?.conversions)} metricType="positive-up" size="md" />
        </div>
        <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Impressions" value={data.impressions.toLocaleString()} metricType="neutral" size="sm" />
          <MetricCard label="Clicks" value={data.clicks.toLocaleString()} metricType="neutral" size="sm" />
          <MetricCard label="CTR" value={data.ctr.toFixed(2) + "%"} metricType="neutral" size="sm" />
          <MetricCard label="CPC" value={fmt(data.cpc)} metricType="negative-up" size="sm" />
        </div>
      </div>

      {/* Time Series Chart (hero visual) */}
      {timeSeriesData.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Performance Overview</h3>
          </div>
          <div className="p-6">
            <TimeSeriesChart
              data={timeSeriesData}
              metrics={[
                { key: "spend", label: "Spend", color: "var(--accent-primary)", type: "area", yAxisId: "left" },
                { key: "clicks", label: "Clicks", color: "var(--accent-tertiary)", type: "line", yAxisId: "right" },
                { key: "conversions", label: "Conversions", color: "var(--accent-secondary)", type: "line", yAxisId: "right" },
              ]}
              height={320}
            />
          </div>
        </div>
      )}

      {/* Campaign Table */}
      {data.campaigns.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Spend</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Conv.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((campaign, idx) => (
                  <tr key={campaign.id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                    <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{campaign.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>{campaign.type}</td>
                    <td className="px-4 py-3"><span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: campaign.status === "active" ? "var(--status-positive-light)" : "var(--bg-tertiary)", color: campaign.status === "active" ? "var(--status-positive)" : "var(--text-tertiary)" }}>{campaign.status}</span></td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(campaign.spend)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--accent-primary)" }}>{fmt(campaign.revenue ?? 0)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{campaign.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(campaign.cpa)}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: roasColor(campaign.roas) }}>{campaign.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Keywords Table */}
      {data.keywords.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Keywords</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Keyword</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Match</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Impr.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CTR</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Conv.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Cost/Conv.</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.slice(0, 20).map((kw, idx) => (
                  <tr key={kw.keyword + "-" + idx} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                    <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{kw.keyword}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>{kw.matchType}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{kw.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{kw.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{kw.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{fmt(kw.cpc)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{kw.conversions}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(kw.costPerConversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
