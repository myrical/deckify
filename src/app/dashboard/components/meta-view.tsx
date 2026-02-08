"use client";

import { MetricCard } from "./metric-card";

interface MetaAdSetRow {
  id: string;
  name: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  roas: number;
}

interface MetaCreative {
  id: string;
  name: string;
  thumbnailUrl?: string;
  campaignName: string;
  adSetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  ctr: number;
}

interface MetaViewData {
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
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpa: number;
    roas: number;
    adSets: MetaAdSetRow[];
  }>;
  creatives: MetaCreative[];
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

export function MetaView({ data }: { data?: MetaViewData }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Connect your Meta Ads account to see campaign performance.
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
        <MetricCard label="CPA" value={fmt(data.cpa)} change={pctChange(data.cpa, prev?.cpa)} trend={trend(pctChange(data.cpa, prev?.cpa) ? -(pctChange(data.cpa, prev?.cpa) ?? 0) : undefined)} size="sm" />
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Impr.</th>
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
                  <td className="px-4 py-3 text-right">{campaign.impressions.toLocaleString()}</td>
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

      {/* Creative Overview */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Creative Overview
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4">
          {data.creatives.slice(0, 8).map((creative) => (
            <div
              key={creative.id}
              className="overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="flex h-40 items-center justify-center bg-gray-100">
                {creative.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creative.thumbnailUrl}
                    alt={creative.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No preview</span>
                )}
              </div>
              {/* Metrics */}
              <div className="p-3">
                <p className="truncate text-xs font-medium text-gray-900">{creative.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {creative.campaignName} &rsaquo; {creative.adSetName}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <p className="text-xs text-gray-400">Spend</p>
                    <p className="text-xs font-semibold text-gray-900">{fmt(creative.spend)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Conv.</p>
                    <p className="text-xs font-semibold text-gray-900">{creative.conversions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CPA</p>
                    <p className="text-xs font-semibold text-gray-900">{fmt(creative.cpa)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CTR</p>
                    <p className="text-xs font-semibold text-gray-900">{creative.ctr.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
