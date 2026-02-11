"use client";

import { useState, useMemo } from "react";
import { MetricCard } from "./metric-card";
import { CampaignChart } from "./charts/campaign-chart";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface MetaAdSetRow { id: string; name: string; campaignName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; }
interface MetaCreative { id: string; name: string; thumbnailUrl?: string; format?: "image" | "video" | "carousel" | "text"; campaignName: string; adSetName: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; ctr: number; }

interface MetaViewData {
  accountName: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; roas: number; ctr: number; cpc: number; cpa: number;
  campaigns: Array<{ id: string; name: string; status: string; spend: number; revenue?: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number; adSets: MetaAdSetRow[]; }>;
  creatives: MetaCreative[];
  previousPeriod?: { spend: number; conversions: number; roas: number; cpa: number; };
  timeSeries?: Array<{ date: string; metrics: Record<string, number> }>;
}

type MetaSubTab = "overview" | "creatives";
type SortKey = "spend" | "roas" | "ctr" | "cpa" | "conversions" | "clicks";

const SORT_OPTIONS: { key: SortKey; label: string; ascending?: boolean }[] = [
  { key: "spend", label: "Spend" },
  { key: "roas", label: "ROAS" },
  { key: "ctr", label: "CTR" },
  { key: "cpa", label: "CPA", ascending: true },
  { key: "conversions", label: "Conversions" },
  { key: "clicks", label: "Clicks" },
];

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function roasColor(roas: number): string {
  if (roas >= 2) return "var(--status-positive)";
  if (roas >= 1) return "var(--status-warning)";
  return "var(--status-negative)";
}

function CreativeCard({ creative }: { creative: MetaCreative }) {
  return (
    <div className="group overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
      <div className="relative" style={{ aspectRatio: "4/5", background: "var(--bg-tertiary)" }}>
        {creative.thumbnailUrl ? (
          <img src={`/api/image-proxy?url=${encodeURIComponent(creative.thumbnailUrl)}`} alt={creative.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>No preview</span>
          </div>
        )}
        {creative.format === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
              <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M8 5v14l11-7z" /></svg>
            </div>
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
        {/* ROAS progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>ROAS</p>
            <p className="text-xs font-semibold font-mono" style={{ color: roasColor(creative.roas) }}>{creative.roas.toFixed(2)}x</p>
          </div>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-tertiary)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(creative.roas / 4 * 100, 100)}%`,
                background: roasColor(creative.roas),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix, placeholder }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-tertiary)" }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder ?? "0"}
          className="w-20 rounded-lg py-1.5 text-xs font-medium outline-none transition-colors"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-primary)", paddingLeft: prefix ? "1.25rem" : "0.625rem", paddingRight: "0.625rem" }}
        />
      </div>
    </div>
  );
}

export function MetaView({ data }: { data?: MetaViewData }) {
  const [subTab, setSubTab] = useState<MetaSubTab>("overview");
  const [sortBy, setSortBy] = useState<SortKey>("spend");
  const [minSpend, setMinSpend] = useState(0);
  const [minRoas, setMinRoas] = useState(0);
  const [campaignFilter, setCampaignFilter] = useState("");

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

  const hasCreatives = data.creatives.length > 0;

  // Unique campaign names for filter dropdown
  const campaignNames = useMemo(() => {
    const names = new Set(data.creatives.map((c) => c.campaignName));
    return Array.from(names).sort();
  }, [data.creatives]);

  // Filter + sort creatives
  const filteredCreatives = useMemo(() => {
    let result = [...data.creatives];

    // Apply filters
    if (minSpend > 0) result = result.filter((c) => c.spend >= minSpend);
    if (minRoas > 0) result = result.filter((c) => c.roas >= minRoas);
    if (campaignFilter) result = result.filter((c) => c.campaignName === campaignFilter);

    // Apply sort
    const sortOption = SORT_OPTIONS.find((o) => o.key === sortBy);
    const ascending = sortOption?.ascending ?? false;
    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return ascending ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [data.creatives, sortBy, minSpend, minRoas, campaignFilter]);

  // Summary metrics for the creatives tab (based on filtered set)
  const creativeTotalSpend = filteredCreatives.reduce((sum, c) => sum + c.spend, 0);
  const creativeTotalConversions = filteredCreatives.reduce((sum, c) => sum + c.conversions, 0);
  const creativeTotalClicks = filteredCreatives.reduce((sum, c) => sum + c.clicks, 0);

  const subTabs: { id: MetaSubTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "creatives", label: "Creatives", count: hasCreatives ? data.creatives.length : undefined },
  ];

  const hasActiveFilters = minSpend > 0 || minRoas > 0 || campaignFilter !== "";

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg-secondary)" }}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${subTab !== tab.id ? "btn-ghost" : ""}`}
            style={{
              background: subTab === tab.id ? "var(--bg-card)" : "transparent",
              color: subTab === tab.id ? "var(--accent-primary)" : "var(--text-tertiary)",
              boxShadow: subTab === tab.id ? "var(--shadow-sm)" : "none",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs" style={{ background: subTab === tab.id ? "var(--accent-primary)" : "var(--bg-tertiary)", color: subTab === tab.id ? "white" : "var(--text-tertiary)" }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === "overview" ? (
        <>
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

          {/* Creative Overview (preview on overview tab) */}
          {hasCreatives && (
            <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Creatives</h3>
                <button
                  onClick={() => setSubTab("creatives")}
                  className="text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--accent-primary)" }}
                >
                  View all {data.creatives.length} creatives &rarr;
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.creatives.slice(0, 4).map((creative) => (
                  <CreativeCard key={creative.id} creative={creative} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Creatives sub-tab */
        <>
          {hasCreatives ? (
            <>
              {/* Creative summary metrics */}
              <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Creative Spend" value={fmt(creativeTotalSpend)} metricType="neutral" size="md" />
                <MetricCard label="Conversions" value={creativeTotalConversions.toLocaleString()} metricType="positive-up" size="md" />
                <MetricCard label="Total Clicks" value={creativeTotalClicks.toLocaleString()} metricType="neutral" size="md" />
                <MetricCard label="Creatives Tracked" value={data.creatives.length.toString()} metricType="neutral" size="md" />
              </div>

              {/* Sort & Filter toolbar */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                <SelectControl
                  label="Sort by"
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortKey)}
                  options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label + (o.ascending ? " (low first)" : "") }))}
                />
                <NumberInput label="Min Spend" value={minSpend} onChange={setMinSpend} prefix="$" placeholder="0" />
                <NumberInput label="Min ROAS" value={minRoas} onChange={setMinRoas} placeholder="0" />
                <SelectControl
                  label="Campaign"
                  value={campaignFilter}
                  onChange={setCampaignFilter}
                  options={[{ value: "", label: "All Campaigns" }, ...campaignNames.map((n) => ({ value: n, label: n.length > 30 ? n.slice(0, 30) + "..." : n }))]}
                />
                <div className="ml-auto flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setMinSpend(0); setMinRoas(0); setCampaignFilter(""); }}
                      className="rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      Clear filters
                    </button>
                  )}
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {filteredCreatives.length} of {data.creatives.length} creatives
                  </span>
                </div>
              </div>

              {/* Full creative grid */}
              <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    {hasActiveFilters ? "Filtered Creatives" : "All Creatives"}
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Sorted by {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? sortBy}{SORT_OPTIONS.find((o) => o.key === sortBy)?.ascending ? ", lowest first" : ", highest first"}
                  </p>
                </div>
                {filteredCreatives.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 p-6 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredCreatives.map((creative) => (
                      <CreativeCard key={creative.id} creative={creative} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No creatives match filters</p>
                    <button
                      onClick={() => { setMinSpend(0); setMinRoas(0); setCampaignFilter(""); }}
                      className="mt-2 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl py-16" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No creative data available</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>Creatives will appear here once ads with spend are running</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
