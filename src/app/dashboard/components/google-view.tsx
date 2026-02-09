"use client";

import { MetricCard } from "./metric-card";
import { CampaignChart } from "./charts/campaign-chart";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface KeywordRow { keyword: string; matchType: string; clicks: number; impressions: number; ctr: number; cpc: number; conversions: number; costPerConversion: number; }

interface GoogleViewData {
  accountName: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; type: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adGroups: Array<{ id: string; name: string; spend: number; clicks: number; conversions: number; cpa: number; }>; }>;
  keywords: KeywordRow[];
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

export function GoogleView({ data }: { data?: GoogleViewData }) {
  if (!data) return null;

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Ad Spend" value={fmtWhole(data.spend)} change={pctChange(data.spend, prev?.spend)} trend={trend(pctChange(data.spend, prev?.spend))} size="lg" metricType="spend" />
        <MetricCard label="Revenue" value={fmtWhole(data.revenue)} change={pctChange(data.revenue, prev?.revenue)} trend={trend(pctChange(data.revenue, prev?.revenue))} size="lg" metricType="revenue" />
        <MetricCard label="ROAS" value={data.roas.toFixed(2) + "x"} change={pctChange(data.roas, prev?.roas)} trend={trend(pctChange(data.roas, prev?.roas))} size="lg" metricType="roas" />
        <MetricCard label="Conversions" value={data.conversions.toLocaleString()} change={pctChange(data.conversions, prev?.conversions)} trend={trend(pctChange(data.conversions, prev?.conversions))} size="lg" metricType="purchases" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Impressions" value={data.impressions.toLocaleString()} size="sm" metricType="neutral" />
        <MetricCard label="Clicks" value={data.clicks.toLocaleString()} size="sm" metricType="neutral" />
        <MetricCard label="CTR" value={data.ctr.toFixed(2) + "%"} size="sm" metricType="ctr" />
        <MetricCard label="CPA" value={fmt(data.cpa)} change={pctChange(data.cpa, prev?.cpa)} trend={trend(pctChange(data.cpa, prev?.cpa) ? -(pctChange(data.cpa, prev?.cpa) ?? 0) : undefined)} size="sm" metricType="cpa" />
      </div>

      {/* Time Series Chart */}
      {data.timeSeries && data.timeSeries.length >= 2 && (
        <TimeSeriesChart timeSeries={data.timeSeries} title="Daily Performance" />
      )}

      {/* Campaign Charts */}
      {data.campaigns.length >= 2 && (
        <CampaignChart campaigns={data.campaigns.map((c) => ({ name: c.name, spend: c.spend, revenue: c.revenue, roas: c.roas }))} />
      )}

      {/* Campaign Table */}
      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Campaign</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Spend</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>ROAS</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Clicks</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>CPA</th>
            </tr></thead>
            <tbody>{data.campaigns.map((campaign, idx) => (
              <tr key={campaign.id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                <td className="px-6 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{campaign.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>{campaign.type}</td>
                <td className="px-4 py-3"><span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: campaign.status === "active" ? "var(--status-positive-light)" : "var(--bg-tertiary)", color: campaign.status === "active" ? "var(--status-positive)" : "var(--text-tertiary)" }}>{campaign.status}</span></td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{fmt(campaign.spend)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--accent-primary)" }}>{fmt(campaign.revenue)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: roasColor(campaign.roas) }}>{campaign.roas.toFixed(2)}x</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{campaign.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{campaign.conversions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{fmt(campaign.cpa)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Keywords Table */}
      {data.keywords.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Keywords</h3>
          </div>
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
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-secondary)" }}>{fmt(kw.cpc)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{kw.conversions}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{fmt(kw.costPerConversion)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
