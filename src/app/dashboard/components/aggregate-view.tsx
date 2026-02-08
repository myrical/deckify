"use client";

import { MetricCard } from "./metric-card";

interface AggregateData {
  totalAdSpend: number;
  totalRevenue: number;
  blendedRoas: number;
  mer: number;
  totalConversions: number;
  totalOrders: number;
  metaSpend: number;
  googleSpend: number;
  metaConversions: number;
  googleConversions: number;
  previousPeriod?: {
    totalAdSpend: number;
    totalRevenue: number;
    blendedRoas: number;
    totalConversions: number;
    totalOrders: number;
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
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AggregateView({ data }: { data?: AggregateData }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Connect your ad accounts and Shopify store to see aggregated performance data.
        </p>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Total Ad Spend"
          value={fmt(data.totalAdSpend)}
          change={pctChange(data.totalAdSpend, prev?.totalAdSpend)}
          trend={trend(pctChange(data.totalAdSpend, prev?.totalAdSpend))}
          size="md"
        />
        <MetricCard
          label="Shopify Revenue"
          value={fmt(data.totalRevenue)}
          change={pctChange(data.totalRevenue, prev?.totalRevenue)}
          trend={trend(pctChange(data.totalRevenue, prev?.totalRevenue))}
          size="md"
        />
        <MetricCard
          label="Blended ROAS"
          value={`${data.blendedRoas.toFixed(2)}x`}
          change={pctChange(data.blendedRoas, prev?.blendedRoas)}
          trend={trend(pctChange(data.blendedRoas, prev?.blendedRoas))}
          size="md"
        />
        <MetricCard
          label="MER"
          value={`${data.mer.toFixed(2)}x`}
          size="md"
        />
        <MetricCard
          label="Total Conversions"
          value={data.totalConversions.toLocaleString()}
          change={pctChange(data.totalConversions, prev?.totalConversions)}
          trend={trend(pctChange(data.totalConversions, prev?.totalConversions))}
          size="md"
        />
        <MetricCard
          label="Shopify Orders"
          value={data.totalOrders.toLocaleString()}
          change={pctChange(data.totalOrders, prev?.totalOrders)}
          trend={trend(pctChange(data.totalOrders, prev?.totalOrders))}
          size="md"
        />
      </div>

      {/* Channel Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Spend by Channel
        </h3>
        <div className="space-y-3">
          {[
            { name: "Meta Ads", spend: data.metaSpend, conversions: data.metaConversions, color: "bg-blue-500" },
            { name: "Google Ads", spend: data.googleSpend, conversions: data.googleConversions, color: "bg-emerald-500" },
          ]
            .filter((ch) => ch.spend > 0)
            .map((channel) => {
              const pct = data.totalAdSpend > 0 ? (channel.spend / data.totalAdSpend) * 100 : 0;
              return (
                <div key={channel.name} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700">{channel.name}</div>
                  <div className="flex-1">
                    <div className="h-6 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`${channel.color} flex h-full items-center rounded-full px-2 text-xs font-medium text-white transition-all`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      >
                        {pct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    {fmt(channel.spend)}
                  </div>
                  <div className="w-20 text-right text-xs text-gray-500">
                    {channel.conversions.toLocaleString()} conv.
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Revenue vs Spend placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Revenue vs Ad Spend (Daily)
        </h3>
        <p className="text-xs text-gray-400">
          Chart will render with actual time series data when accounts are connected.
        </p>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-gray-50">
          <span className="text-sm text-gray-400">Line chart: Shopify revenue vs Meta + Google spend</span>
        </div>
      </div>
    </div>
  );
}
