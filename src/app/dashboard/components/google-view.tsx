"use client";

import { MetricCard } from "./metric-card";

interface KeywordRow { keyword: string; matchType: string; clicks: number; impressions: number; ctr: number; cpc: number; conversions: number; costPerConversion: number; }

interface GoogleViewData {
  accountName: string; spend: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; type: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adGroups: Array<{ id: string; name: string; spend: number; clicks: number; conversions: number; cpa: number; }>; }>;
  keywords: KeywordRow[];
  previousPeriod?: { spend: number; conversions: number; roas: number; cpa: number; };
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function trend(change?: number): "up" | "down" | "flat" | undefined { if (change === undefined) return undefined; return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat"; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function GoogleView({ data }: { data?: GoogleViewData }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-xl py-16" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(66, 133, 244, 0.1)" }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" /><path fill="#FBBC05" d="M5.84 14.09A6.9 6.9 0 0 1 5.84 9.91V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" /></svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Connect your Google Ads account</p>
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
        <MetricCard label="CPA" value={fmt(data.cpa)} size="sm" />
        <MetricCard label="ROAS" value={data.roas.toFixed(2) + "x"} change={pctChange(data.roas, prev?.roas)} trend={trend(pctChange(data.roas, prev?.roas))} size="sm" />
        <MetricCard label="CPC" value={fmt(data.cpc)} size="sm" />
      </div>

      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}><h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaigns</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaign</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Spend</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPA</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>ROAS</th>
            </tr></thead>
            <tbody>{data.campaigns.map((campaign, idx) => (
              <tr key={campaign.id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{campaign.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>{campaign.type}</td>
                <td className="px-4 py-3"><span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: campaign.status === "active" ? "var(--status-positive-light)" : "var(--bg-tertiary)", color: campaign.status === "active" ? "var(--status-positive)" : "var(--text-tertiary)" }}>{campaign.status}</span></td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(campaign.spend)}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{campaign.conversions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{fmt(campaign.cpa)}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{campaign.roas.toFixed(2)}x</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}><h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Keywords</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Keyword</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Match</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Impr.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CTR</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPC</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Cost/Conv.</th>
            </tr></thead>
            <tbody>{data.keywords.slice(0, 20).map((kw, idx) => (
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
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
