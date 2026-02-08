"use client";

import { MetricCard } from "./metric-card";

interface MetaAdSetRow { id: string; name: string; campaignName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; }
interface MetaCreative { id: string; name: string; thumbnailUrl?: string; campaignName: string; adSetName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; ctr: number; }

interface MetaViewData {
  accountName: string; spend: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adSets: MetaAdSetRow[]; }>;
  creatives: MetaCreative[];
  previousPeriod?: { spend: number; conversions: number; roas: number; cpa: number; };
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function trend(change?: number): "up" | "down" | "flat" | undefined { if (change === undefined) return undefined; return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat"; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function MetaView({ data }: { data?: MetaViewData }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-xl py-16" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(24, 119, 242, 0.1)" }}>
            <svg viewBox="0 0 24 24" fill="#1877F2" className="h-6 w-6"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z" /></svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Connect your Meta Ads account</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>to see campaign performance</p>
        </div>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="Spend" value={fmt(data.spend)} change={pctChange(data.spend, prev?.spend)} trend={trend(pctChange(data.spend, prev?.spend))} size="sm" />
        <MetricCard label="Impressions" value={data.impressions.toLocaleString()} size="sm" />
        <MetricCard label="Clicks" value={data.clicks.toLocaleString()} size="sm" />
        <MetricCard label="CTR" value={data.ctr.toFixed(2) + "%"} size="sm" />
        <MetricCard label="Conversions" value={data.conversions.toLocaleString()} change={pctChange(data.conversions, prev?.conversions)} trend={trend(pctChange(data.conversions, prev?.conversions))} size="sm" />
        <MetricCard label="CPA" value={fmt(data.cpa)} change={pctChange(data.cpa, prev?.cpa)} trend={trend(pctChange(data.cpa, prev?.cpa) ? -(pctChange(data.cpa, prev?.cpa) ?? 0) : undefined)} size="sm" />
        <MetricCard label="ROAS" value={data.roas.toFixed(2) + "x"} change={pctChange(data.roas, prev?.roas)} trend={trend(pctChange(data.roas, prev?.roas))} size="sm" />
        <MetricCard label="CPC" value={fmt(data.cpc)} size="sm" />
      </div>

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
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Impr.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
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
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{campaign.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(campaign.cpa)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{campaign.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creative Overview */}
      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Creative Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4">
          {data.creatives.slice(0, 8).map((creative) => (
            <div key={creative.id} className="group overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex h-40 items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                {creative.thumbnailUrl ? (
                  <img src={creative.thumbnailUrl} alt={creative.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>No preview</span>
                )}
              </div>
              <div className="p-3" style={{ background: "var(--bg-card)" }}>
                <p className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>{creative.name}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>{creative.campaignName} &rsaquo; {creative.adSetName}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Spend</p><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(creative.spend)}</p></div>
                  <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Conv.</p><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{creative.conversions}</p></div>
                  <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CPA</p><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(creative.cpa)}</p></div>
                  <div><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>CTR</p><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{creative.ctr.toFixed(2)}%</p></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
