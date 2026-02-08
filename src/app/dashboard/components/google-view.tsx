"use client";

import { MetricCard } from "./metric-card";

interface KeywordRow {
  keyword: string;
  matchType: string;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
}

interface GoogleViewData {
  accountName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    type: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpa: number;
    roas: number;
    adGroups: Array<{
      id: string;
      name: string;
      spend: number;
      clicks: number;
      conversions: number;
      cpa: number;
    }>;
  }>;
  keywords: KeywordRow[];
  previousPeriod?: {
    spend: number;
    conversions: number;
    roas: number;
    cpa: number;
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
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GoogleView({ data }: { data?: GoogleViewData }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Connect your Google Ads account to see campaign performance.
        </p>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      {/* Account KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="Spend" value={fmt(data.spend)} change={pctChange(data.spend, prev?.spend)} trend={trend(pctChange(data.spend, prev?.spend))} size="sm" />
        <MetricCard label="Impressions" value={data.impressions.toLocaleString()} size="sm" />
        <MetricCard label="Clicks" value={data.clicks.toLocaleString()} size="sm" />
        <MetricCard label="CTR" value={`${data.ctr.toFixed(2)}%`} size="sm" />
        <MetricCard label="Conversions" value={data.conversions.toLocaleString()} change={pctChange(data.conversions, prev?.conversions)} trend={trend(pctChange(data.conversions, prev?.conversions))} size="sm" />
        <MetricCard label="CPA" value={fmt(data.cpa)} size="sm" />
        <MetricCard label="ROAS" value={`${data.roas.toFixed(2)}x`} change={pctChange(data.roas, prev?.roas)} trend={trend(pctChange(data.roas, prev?.roas))} size="sm" />
        <MetricCard label="CPC" value={fmt(data.cpc)} size="sm" />
      </div>

      {/* Campaign Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Campaigns
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Campaign</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3 text-right">CPA</th>
                <th className="px-4 py-3 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign, idx) => (
                <tr
                  key={campaign.id}
                  className={`border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{campaign.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        campaign.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(campaign.spend)}</td>
                  <td className="px-4 py-3 text-right">{campaign.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{campaign.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{fmt(campaign.cpa)}</td>
                  <td className="px-4 py-3 text-right">{campaign.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyword Performance */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Top Keywords
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Keyword</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Impr.</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">CPC</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3 text-right">Cost/Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.keywords.slice(0, 20).map((kw, idx) => (
                <tr
                  key={`${kw.keyword}-${idx}`}
                  className={`border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-6 py-3 font-medium text-gray-900">{kw.keyword}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{kw.matchType}</td>
                  <td className="px-4 py-3 text-right">{kw.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{kw.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{kw.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">{fmt(kw.cpc)}</td>
                  <td className="px-4 py-3 text-right">{kw.conversions}</td>
                  <td className="px-4 py-3 text-right">{fmt(kw.costPerConversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
