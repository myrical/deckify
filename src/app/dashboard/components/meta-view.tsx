"use client";

import { MetricCard } from "./metric-card";
import { CampaignChart } from "./charts/campaign-chart";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface MetaAdSetRow { id: string; name: string; campaignName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; }
interface MetaCreative {
  id: string; name: string; thumbnailUrl?: string; videoId?: string; campaignName: string; adSetName: string;
  spend: number; impressions: number; clicks: number; conversions: number; cpa: number; ctr: number;
  revenue?: number; roas?: number; cpm?: number;
}

interface MetaViewData {
  accountName: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adSets: MetaAdSetRow[]; }>;
  creatives: MetaCreative[];
  timeSeries?: Array<{ date: string; spend: number; revenue: number; roas: number }>;
  previousPeriod?: { spend: number; conversions: number; roas: number; cpa: number; revenue?: number };
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function trend(change?: number): "up" | "down" | "flat" | undefined { if (change === undefined) return undefined; return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat"; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtWhole(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function roasColor(roas: number): string {
  if (roas >= 2) return "var(--status-positive)";
  if (roas >= 1) return "var(--status-warning)";
  return "var(--status-negative)";
}

export function MetaView({ data }: { data?: MetaViewData }) {
  if (!data) return null;

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Ad Spend" value={fmtWhole(data.spend)} change={pctChange(data.spend, prev?.spend)} trend={trend(pctChange(data.spend, prev?.spend))} size="lg" metricType="spend" />
        <MetricCard label="Revenue" value={fmtWhole(data.revenue)} change={pctChange(data.revenue, prev?.revenue)} trend={trend(pctChange(data.revenue, prev?.revenue))} size="lg" metricType="revenue" />
        <MetricCard label="ROAS" value={data.roas.toFixed(2) + "x"} change={pctChange(data.roas, prev?.roas)} trend={trend(pctChange(data.roas, prev?.roas))} size="lg" metricType="roas" />
        <MetricCard label="Purchases" value={data.conversions.toLocaleString()} change={pctChange(data.conversions, prev?.conversions)} trend={trend(pctChange(data.conversions, prev?.conversions))} size="lg" metricType="purchases" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Impressions" value={data.impressions.toLocaleString()} size="sm" metricType="neutral" />
        <MetricCard label="Clicks" value={data.clicks.toLocaleString()} size="sm" metricType="neutral" />
        <MetricCard label="CTR" value={data.ctr.toFixed(2) + "%"} size="sm" metricType="ctr" />
        <MetricCard label="CPC" value={fmt(data.cpc)} size="sm" metricType="cpc" />
      </div>

      {/* Campaign Charts */}
      {data.campaigns.length >= 2 && (
        <CampaignChart campaigns={data.campaigns.map((c) => ({ name: c.name, spend: c.spend, revenue: c.revenue, roas: c.roas }))} />
      )}

      {/* Time Series */}
      {data.timeSeries && data.timeSeries.length >= 2 && (
        <TimeSeriesChart timeSeries={data.timeSeries} />
      )}

      {/* Campaign Table */}
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
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>ROAS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Impr.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Purchases</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPA</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign, idx) => (
                <tr key={campaign.id} className="transition-colors" style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                  <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{campaign.name}</td>
                  <td className="px-4 py-3"><span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: campaign.status === "active" ? "var(--status-positive-light)" : "var(--bg-tertiary)", color: campaign.status === "active" ? "var(--status-positive)" : "var(--text-tertiary)" }}>{campaign.status}</span></td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{fmt(campaign.spend)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--accent-primary)" }}>{fmt(campaign.revenue)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: roasColor(campaign.roas) }}>{campaign.roas.toFixed(2)}x</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{campaign.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{fmt(campaign.cpa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creative Cards */}
      {data.creatives.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Creative Performance</h3>
          </div>

          {/* Creative summary */}
          <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Total Spend</p>
              <p className="mt-1 text-lg font-extrabold font-mono" style={{ color: "var(--text-primary)" }}>{fmtWhole(data.creatives.reduce((s, c) => s + c.spend, 0))}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue</p>
              <p className="mt-1 text-lg font-extrabold font-mono" style={{ color: "var(--text-primary)" }}>{fmtWhole(data.creatives.reduce((s, c) => s + (c.revenue ?? 0), 0))}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Purchases</p>
              <p className="mt-1 text-lg font-extrabold font-mono" style={{ color: "var(--text-primary)" }}>{data.creatives.reduce((s, c) => s + c.conversions, 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</p>
              <p className="mt-1 text-lg font-extrabold font-mono" style={{ color: "var(--text-primary)" }}>{data.creatives.reduce((s, c) => s + c.clicks, 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Creative grid */}
          <div className="grid grid-cols-1 gap-4 p-6 pt-0 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.creatives.slice(0, 8).map((creative) => {
              const creativeRoas = creative.roas ?? (creative.spend > 0 && creative.revenue ? creative.revenue / creative.spend : 0);
              return (
                <div key={creative.id} className="group overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
                  {/* Image */}
                  <div className="relative" style={{ aspectRatio: "4/5", background: "var(--bg-tertiary)" }}>
                    {creative.thumbnailUrl ? (
                      <img
                        src={creative.thumbnailUrl.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(creative.thumbnailUrl)}` : creative.thumbnailUrl}
                        alt={creative.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>No preview</span>
                      </div>
                    )}
                    {/* Video overlay */}
                    {creative.videoId && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3" style={{ background: "var(--bg-card)" }}>
                    <p className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>{creative.name}</p>
                    <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>{creative.campaignName} &rsaquo; {creative.adSetName}</p>

                    {/* ROAS bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "var(--text-tertiary)" }}>ROAS</span>
                        <span className="font-mono font-semibold" style={{ color: roasColor(creativeRoas) }}>{creativeRoas.toFixed(2)}x</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-tertiary)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (creativeRoas / 4) * 100)}%`,
                            background: roasColor(creativeRoas),
                          }}
                        />
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                      <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Spend</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{fmt(creative.spend)}</p></div>
                      <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Purchases</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{creative.conversions}</p></div>
                      <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CTR</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{creative.ctr.toFixed(2)}%</p></div>
                      <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CPA</p><p className="text-xs font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{fmt(creative.cpa)}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
