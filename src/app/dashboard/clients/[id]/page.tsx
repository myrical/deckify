"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MetaView } from "../../components/meta-view";
import { GoogleView } from "../../components/google-view";
import { ShopifyView } from "../../components/shopify-view";
import { AnalyticsErrorBanner } from "../../components/analytics-error-banner";

interface AdAccountInfo {
  id: string;
  platform: string;
  platformId: string;
  name: string;
  status: string;
}

interface ClientDetail {
  id: string;
  name: string;
  createdAt: string;
  adAccounts: AdAccountInfo[];
}

type ActivePlatform = "meta" | "google" | "shopify";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<ActivePlatform | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ accountId: string; accountName: string; error: string; code: string; recoveryAction: string }>>([]);
  const [accountsFound, setAccountsFound] = useState<number | null>(null);

  // Fetch client info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const json = await res.json();
          const found = (json.clients ?? []).find((c: ClientDetail) => c.id === clientId);
          if (found) {
            setClient(found);
            // Auto-select first platform that has accounts
            const platforms = [...new Set(found.adAccounts.map((a: AdAccountInfo) => a.platform))] as ActivePlatform[];
            if (platforms.length > 0) {
              setActivePlatform(platforms[0]);
            }
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  // Fetch analytics for selected platform
  const fetchAnalytics = useCallback(async () => {
    if (!activePlatform || !clientId) return;
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    setErrors([]);
    setAccountsFound(null);
    try {
      const res = await fetch(`/api/analytics?platform=${activePlatform}&clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setErrors(json.errors ?? []);
        setAccountsFound(json.accountsFound ?? 0);
        const summaries = json.data ?? [];
        if (summaries.length > 0) {
          setAnalyticsData(summaries[0]);
        }
      }
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false);
    }
  }, [activePlatform, clientId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Client not found.</p>
      </div>
    );
  }

  const platforms = [...new Set(client.adAccounts.map((a) => a.platform))] as ActivePlatform[];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="mb-2 inline-block text-xs font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          Clients
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {client.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {client.adAccounts.length} data source{client.adAccounts.length !== 1 ? "s" : ""} assigned
        </p>
      </div>

      {/* Platform tabs */}
      {platforms.length > 0 && (
        <div className="mb-6 flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className="rounded-md px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: activePlatform === p ? "var(--bg-card)" : "transparent",
                color: activePlatform === p ? (PLATFORM_COLORS[p] ?? "var(--text-primary)") : "var(--text-tertiary)",
                boxShadow: activePlatform === p ? "var(--shadow-sm)" : "none",
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Analytics view */}
      {analyticsLoading ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading analytics...</p>
      ) : activePlatform ? (
        <>
          <AnalyticsErrorBanner errors={errors} accountsFound={accountsFound} platform={activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)} />
          {activePlatform === "meta" ? (
            <MetaView data={analyticsData ? transformMetaData(analyticsData) : undefined} />
          ) : activePlatform === "google" ? (
            <GoogleView data={analyticsData ? transformGoogleData(analyticsData) : undefined} />
          ) : activePlatform === "shopify" ? (
            <ShopifyView data={analyticsData ? transformShopifyData(analyticsData) : undefined} />
          ) : null}
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No data sources assigned to this client.
          </p>
          <Link
            href="/dashboard/data-sources"
            className="mt-2 text-sm font-medium"
            style={{ color: "var(--accent-primary)" }}
          >
            Assign data sources
          </Link>
        </div>
      )}

      {/* Data sources list */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Assigned Data Sources
          </h2>
          <Link
            href={`/generate?clientId=${client.id}`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}
          >
            Generate Deck
          </Link>
        </div>
        <div className="space-y-2">
          {client.adAccounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: PLATFORM_COLORS[acc.platform] ?? "#666" }}
              >
                {acc.platform.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {acc.name}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {acc.platformId}
                </p>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: acc.status === "active" ? "var(--status-positive-light)" : "var(--bg-tertiary)",
                  color: acc.status === "active" ? "var(--status-positive)" : "var(--text-tertiary)",
                }}
              >
                {acc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transform API response to view component shapes                    */
/* ------------------------------------------------------------------ */

function transformMetaData(s: Record<string, unknown>) {
  const metrics = s.metrics as Record<string, number> | undefined;
  const campaigns = (s.campaigns ?? []) as Array<Record<string, unknown>>;
  const prevMetrics = s.previousPeriodMetrics as Record<string, number> | undefined;
  const account = s.account as Record<string, string> | undefined;

  return {
    accountName: account?.name ?? "Meta Ads",
    spend: metrics?.spend ?? 0,
    impressions: metrics?.impressions ?? 0,
    clicks: metrics?.clicks ?? 0,
    conversions: metrics?.conversions ?? 0,
    roas: metrics?.roas ?? 0,
    ctr: metrics?.ctr ?? 0,
    cpc: metrics?.cpc ?? 0,
    cpa: metrics?.cpa ?? 0,
    campaigns: campaigns.map((c) => {
      const cm = c.metrics as Record<string, number> | undefined;
      return {
        id: c.id as string,
        name: c.name as string,
        status: c.status as string,
        spend: cm?.spend ?? 0,
        impressions: cm?.impressions ?? 0,
        clicks: cm?.clicks ?? 0,
        conversions: cm?.conversions ?? 0,
        cpa: cm?.cpa ?? 0,
        roas: cm?.roas ?? 0,
        adSets: [],
      };
    }),
    creatives: [],
    previousPeriod: prevMetrics
      ? { spend: prevMetrics.spend, conversions: prevMetrics.conversions, roas: prevMetrics.roas, cpa: prevMetrics.cpa }
      : undefined,
  };
}

function transformGoogleData(s: Record<string, unknown>) {
  const metrics = s.metrics as Record<string, number> | undefined;
  const campaigns = (s.campaigns ?? []) as Array<Record<string, unknown>>;
  const prevMetrics = s.previousPeriodMetrics as Record<string, number> | undefined;
  const account = s.account as Record<string, string> | undefined;

  return {
    accountName: account?.name ?? "Google Ads",
    spend: metrics?.spend ?? 0,
    impressions: metrics?.impressions ?? 0,
    clicks: metrics?.clicks ?? 0,
    conversions: metrics?.conversions ?? 0,
    roas: metrics?.roas ?? 0,
    ctr: metrics?.ctr ?? 0,
    cpc: metrics?.cpc ?? 0,
    cpa: metrics?.cpa ?? 0,
    campaigns: campaigns.map((c) => {
      const cm = c.metrics as Record<string, number> | undefined;
      return {
        id: c.id as string,
        name: c.name as string,
        status: c.status as string,
        type: (c.objective as string) ?? "Search",
        spend: cm?.spend ?? 0,
        impressions: cm?.impressions ?? 0,
        clicks: cm?.clicks ?? 0,
        conversions: cm?.conversions ?? 0,
        cpa: cm?.cpa ?? 0,
        roas: cm?.roas ?? 0,
        adGroups: [],
      };
    }),
    keywords: [],
    previousPeriod: prevMetrics
      ? { spend: prevMetrics.spend, conversions: prevMetrics.conversions, roas: prevMetrics.roas, cpa: prevMetrics.cpa }
      : undefined,
  };
}

function transformShopifyData(s: Record<string, unknown>) {
  const metrics = s.metrics as Record<string, number> | undefined;
  const prevMetrics = s.previousPeriodMetrics as Record<string, number> | undefined;
  const account = s.account as Record<string, string> | undefined;

  return {
    storeName: account?.name ?? "Shopify Store",
    revenue: metrics?.revenue ?? 0,
    orders: metrics?.orders ?? 0,
    averageOrderValue: metrics?.averageOrderValue ?? 0,
    newCustomers: metrics?.newCustomers ?? 0,
    returningCustomers: metrics?.returningCustomers ?? 0,
    refunds: metrics?.refunds ?? 0,
    refundAmount: metrics?.refundAmount ?? 0,
    topProducts: ((s.topProducts ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: (p.id as string) ?? "",
      name: (p.name as string) ?? "",
      imageUrl: p.imageUrl as string | undefined,
      revenue: (p.revenue as number) ?? 0,
      unitsSold: (p.unitsSold as number) ?? 0,
    })),
    previousPeriod: prevMetrics
      ? { revenue: prevMetrics.revenue, orders: prevMetrics.orders, averageOrderValue: prevMetrics.averageOrderValue, newCustomers: prevMetrics.newCustomers ?? 0 }
      : undefined,
  };
}
