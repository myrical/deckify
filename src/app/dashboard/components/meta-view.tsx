"use client";

import { MetricCard } from "./metric-card";
import { CampaignChart } from "./charts/campaign-chart";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface MetaAdSetRow { id: string; name: string; campaignName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; }
interface MetaCreative { id: string; name: string; thumbnailUrl?: string; campaignName: string; adSetName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; ctr: number; }

interface MetaViewData {
  accountName: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adSets: MetaAdSetRow[]; }>;
  creatives: MetaCreative[];
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

export function MetaView({ data }: { data?: MetaViewData }) {
  if (!data) return null;

  const prev = data.previousPeriod;

  const timeSeriesData = (data.timeSeries ?? []).map((ts) => ({
    date: ts.date,
    spend: ts.metrics?.spend ?? 0,
    conversions: ts.metrics?.conversions ?? 0,
  }));

  const campaignChartData = data.campaigns.map((c) => ({
    name: c.name,
    spend: c.spend,
    revenue: c.revenue ?? 0,
    roas: c.roas,
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

      {/* Time Series Chart */}
      {timeSeriesData.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Daily Performance</h3>
          </div>
          <div className="p-6">
            <TimeSeriesChart
              data={timeSeriesData}
              metrics={[
                { key: "spend", label: "Spend", color: "var(--accent-primary)", type: "bar", yAxisId: "left" },
                { key: "conversions", label: "Conversions", color: "var(--accent-secondary)", type: "line", yAxisId: "right" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Campaign Performance Chart */}
      {data.campaigns.length >= 2 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaign Performance</h3>
          </div>
          <div className="p-6">
            <CampaignChart data={campaignChartData} />
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
                  <tr key={campaign.id} className="transition-colors" style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                    <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{campaign.name}</td>
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

      {/* Creative Overview */}
      {data.creatives.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Creative Overview</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.creatives.slice(0, 8).map((creative) => (
              <div key={creative.id} className="group overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
                <div className="relative" style={{ aspectRatio: "4/5", background: "var(--bg-tertiary)" }}>
                  {creative.thumbnailUrl ? (
                    <img src={`/api/image-proxy?url=${encodeURIComponent(creative.thumbnailUrl)}`} alt={creative.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>No preview</span>
                    </div>
                  )}
                </div>
                <div className="p-3" style={{ background: "var(--bg-card)" }}>
                  <p className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>{creative.name}</p>
                  <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>{creative.campaignName} &rsaquo; {creative.adSetName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Spend</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{fmt(creative.spend)}</p></div>
                    <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Conv.</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{creative.conversions}</p></div>
                    <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CPA</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{fmt(creative.cpa)}</p></div>
                    <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CTR</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{creative.ctr.toFixed(2)}%</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
