"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MetaView } from "../../components/meta-view";
import { GoogleView } from "../../components/google-view";
import { ShopifyView } from "../../components/shopify-view";
import { AllPlatformsView, type AllPlatformsViewData } from "../../components/all-platforms-view";
import { AnalyticsErrorBanner } from "../../components/analytics-error-banner";
import { AnalyticsSkeleton } from "../../components/loading-skeleton";

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

interface ClientOption {
  id: string;
  name: string;
}

type PlatformKey = "meta" | "google" | "shopify";
type ActiveTab = "all" | PlatformKey;

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  shopify: "Shopify",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ accountId: string; accountName: string; error: string; code: string; recoveryAction: string }>>([]);
  const [accountsFound, setAccountsFound] = useState<number | null>(null);

  // All Platforms tab data
  const [allPlatformsData, setAllPlatformsData] = useState<AllPlatformsViewData | null>(null);
  const [allPlatformsLoading, setAllPlatformsLoading] = useState(false);

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reassign dropdown state
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [allClients, setAllClients] = useState<ClientOption[]>([]);

  // Unassign confirmation
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  // Fetch client info
  const fetchClient = useCallback(async () => {
    try {
      const clientRes = await fetch("/api/clients");
      if (clientRes.ok) {
        const json = await clientRes.json();
        const allC = (json.clients ?? []) as ClientDetail[];
        setAllClients(allC.map((c) => ({ id: c.id, name: c.name })));
        const found = allC.find((c) => c.id === clientId);
        if (found) {
          setClient(found);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // Derive connected platforms from client
  const platforms = client
    ? ([...new Set(client.adAccounts.map((a) => a.platform))] as PlatformKey[])
    : [];

  // Fetch "All Platforms" aggregated data
  const fetchAllPlatforms = useCallback(async () => {
    if (!clientId || platforms.length === 0) return;
    setAllPlatformsLoading(true);
    setAllPlatformsData(null);

    try {
      // Fetch all connected platforms in parallel
      const fetches = platforms.map((p) =>
        fetch(`/api/analytics?platform=${p}&clientId=${clientId}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      );
      const results = await Promise.all(fetches);

      // Build a map: platform -> first summary
      const platformData: Record<string, Record<string, unknown>> = {};
      platforms.forEach((p, i) => {
        const json = results[i];
        if (json) {
          const summaries = json.data ?? [];
          if (summaries.length > 0) {
            platformData[p] = summaries[0];
          }
        }
      });

      // Aggregate into AllPlatformsViewData
      let totalSpend = 0;
      let totalRevenue = 0;
      let prevTotalSpend = 0;
      let prevTotalRevenue = 0;
      let hasPrev = false;

      const allPlatforms: AllPlatformsViewData["platforms"] = {};

      // Time series merge map: date -> { spend, revenue }
      const tsMap = new Map<string, { spend: number; revenue: number }>();

      // Process ad platforms (meta, google)
      for (const p of ["meta", "google"] as const) {
        const data = platformData[p];
        if (!data) continue;
        const metrics = data.metrics as Record<string, number> | undefined;
        const prevMetrics = data.previousPeriodMetrics as Record<string, number> | undefined;
        const timeSeries = (data.timeSeries ?? []) as Array<Record<string, unknown>>;

        const spend = metrics?.spend ?? 0;
        const revenue = metrics?.revenue ?? 0;
        const conversions = metrics?.conversions ?? 0;
        const roas = spend > 0 ? revenue / spend : 0;

        allPlatforms[p] = { spend, revenue, conversions, roas };
        totalSpend += spend;
        totalRevenue += revenue;

        if (prevMetrics) {
          hasPrev = true;
          prevTotalSpend += prevMetrics.spend ?? 0;
          prevTotalRevenue += prevMetrics.revenue ?? 0;
        }

        // Merge time series
        for (const ts of timeSeries) {
          const date = ts.date as string;
          const tsMetrics = ts.metrics as Record<string, number> | undefined;
          const existing = tsMap.get(date) ?? { spend: 0, revenue: 0 };
          existing.spend += tsMetrics?.spend ?? 0;
          existing.revenue += tsMetrics?.revenue ?? 0;
          tsMap.set(date, existing);
        }
      }

      // Process Shopify (e-commerce)
      const shopifyData = platformData["shopify"];
      if (shopifyData) {
        const metrics = shopifyData.metrics as Record<string, number> | undefined;
        const prevMetrics = shopifyData.previousPeriodMetrics as Record<string, number> | undefined;
        const timeSeries = (shopifyData.timeSeries ?? []) as Array<Record<string, unknown>>;

        const shopifyRevenue = metrics?.revenue ?? 0;
        const shopifyOrders = metrics?.orders ?? 0;

        allPlatforms.shopify = { revenue: shopifyRevenue, orders: shopifyOrders };

        // Shopify revenue is the primary revenue source (replaces ad platform revenue for MER calc)
        if (shopifyRevenue > 0) {
          totalRevenue = shopifyRevenue;
          if (prevMetrics) {
            hasPrev = true;
            prevTotalRevenue = prevMetrics.revenue ?? 0;
          }
        }

        // Add Shopify revenue to time series
        for (const ts of timeSeries) {
          const date = ts.date as string;
          const tsMetrics = ts.metrics as { revenue?: number } | undefined;
          const existing = tsMap.get(date) ?? { spend: 0, revenue: 0 };
          if (shopifyRevenue > 0) {
            // Use Shopify revenue instead of ad platform revenue
            existing.revenue = tsMetrics?.revenue ?? 0;
          }
          tsMap.set(date, existing);
        }
      }

      const mer = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const roas = mer; // For blended view, ROAS = MER

      const prevMer = prevTotalSpend > 0 ? prevTotalRevenue / prevTotalSpend : 0;

      // Sort time series by date
      const timeSeries = [...tsMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, spend: vals.spend, revenue: vals.revenue }));

      setAllPlatformsData({
        totalSpend,
        totalRevenue,
        mer,
        roas,
        platforms: allPlatforms,
        previousPeriod: hasPrev
          ? { totalSpend: prevTotalSpend, totalRevenue: prevTotalRevenue, mer: prevMer, roas: prevMer }
          : undefined,
        timeSeries,
      });
    } catch {
      // silent
    } finally {
      setAllPlatformsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, platforms.join(",")]);

  useEffect(() => {
    if (activeTab === "all" && client) {
      fetchAllPlatforms();
    }
  }, [activeTab, client, fetchAllPlatforms]);

  // Fetch analytics for selected platform tab (not "all")
  const fetchAnalytics = useCallback(async () => {
    if (!activeTab || activeTab === "all" || !clientId) return;
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    setErrors([]);
    setAccountsFound(null);
    try {
      const res = await fetch(`/api/analytics?platform=${activeTab}&clientId=${clientId}`);
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
  }, [activeTab, clientId]);

  useEffect(() => {
    if (activeTab !== "all") {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  const renameClient = async () => {
    const name = editName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setEditingName(false);
        fetchClient();
      }
    } catch {
      // silent
    }
  };

  const deleteClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/clients");
      }
    } catch {
      // silent
    }
  };

  const unassignDataSource = async (dataSourceId: string) => {
    try {
      await fetch("/api/data-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId, clientId: null }),
      });
      setUnassigningId(null);
      fetchClient();
      if (activeTab === "all") fetchAllPlatforms();
      else fetchAnalytics();
    } catch {
      // silent
    }
  };

  const reassignDataSource = async (dataSourceId: string, newClientId: string) => {
    try {
      await fetch("/api/data-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId, clientId: newClientId }),
      });
      setReassigningId(null);
      fetchClient();
      if (activeTab === "all") fetchAllPlatforms();
      else fetchAnalytics();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <AnalyticsSkeleton variant="overview" />
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

  // Build tab list: "All Platforms" is always first, then connected platforms
  const availableTabs: Array<{ id: ActiveTab; label: string; color?: string }> = [
    { id: "all", label: "All Platforms" },
    ...platforms.map((p) => ({
      id: p as ActiveTab,
      label: PLATFORM_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1),
      color: PLATFORM_COLORS[p],
    })),
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-tertiary)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 0 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Clients
        </Link>
        <div className="flex items-center gap-3">
          {editingName ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameClient();
                if (e.key === "Escape") setEditingName(false);
              }}
              onBlur={() => renameClient()}
              autoFocus
              className="rounded-md px-2 py-1 text-2xl font-bold outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
          ) : (
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {client.name}
            </h1>
          )}
          <button
            onClick={() => { setEditingName(true); setEditName(client.name); }}
            className="rounded-md p-1"
            style={{ color: "var(--text-tertiary)" }}
            title="Rename"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md p-1"
            style={{ color: "var(--status-negative, #ef4444)" }}
            title="Delete client"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {client.adAccounts.length} data source{client.adAccounts.length !== 1 ? "s" : ""} assigned
        </p>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="mx-4 w-full max-w-sm rounded-xl p-6" style={{ background: "var(--bg-card)" }}>
            <h3 className="mb-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Delete {client.name}?
            </h3>
            <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              {client.adAccounts.length > 0
                ? `${client.adAccounts.length} data source${client.adAccounts.length !== 1 ? "s" : ""} will be unassigned.`
                : "This client has no data sources assigned."}
              {" "}This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={deleteClient}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--status-negative)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign confirmation modal */}
      {unassigningId && (() => {
        const acc = client.adAccounts.find((a) => a.id === unassigningId);
        if (!acc) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="mx-4 w-full max-w-sm rounded-xl p-6" style={{ background: "var(--bg-card)" }}>
              <h3 className="mb-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Unassign {acc.name}?
              </h3>
              <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                Remove this data source from {client.name}. It can be reassigned later.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setUnassigningId(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => unassignDataSource(unassigningId)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--status-negative)" }}
                >
                  Unassign
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Platform tabs */}
      <div className="mb-6 flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
              color: activeTab === tab.id
                ? (tab.color ?? "var(--accent-primary)")
                : "var(--text-tertiary)",
              boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics view */}
      {activeTab === "all" ? (
        allPlatformsLoading ? (
          <AnalyticsSkeleton variant="overview" />
        ) : (
          <AllPlatformsView data={allPlatformsData ?? undefined} />
        )
      ) : analyticsLoading ? (
        <AnalyticsSkeleton variant={activeTab === "shopify" ? "shopify" : activeTab === "google" ? "google" : "meta"} />
      ) : (
        <>
          <AnalyticsErrorBanner errors={errors} accountsFound={accountsFound} platform={PLATFORM_LABELS[activeTab] ?? activeTab} />
          {activeTab === "meta" ? (
            <MetaView data={analyticsData ? transformMetaData(analyticsData) : undefined} />
          ) : activeTab === "google" ? (
            <GoogleView data={analyticsData ? transformGoogleData(analyticsData) : undefined} />
          ) : activeTab === "shopify" ? (
            <ShopifyView data={analyticsData ? transformShopifyData(analyticsData) : undefined} />
          ) : null}
        </>
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
        {client.adAccounts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10"
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
        ) : (
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
                {reassigningId === acc.id ? (
                  <select
                    autoFocus
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) reassignDataSource(acc.id, e.target.value);
                    }}
                    onBlur={() => setReassigningId(null)}
                    className="rounded-lg px-2 py-1 text-xs outline-none"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="" disabled>Move to...</option>
                    {allClients
                      .filter((c) => c.id !== clientId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setReassigningId(acc.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium"
                    style={{ color: "var(--text-tertiary)", background: "var(--bg-secondary)" }}
                    title="Reassign to another client"
                  >
                    Move
                  </button>
                )}
                <button
                  onClick={() => setUnassigningId(acc.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium"
                  style={{ color: "var(--status-negative, #ef4444)" }}
                  title="Unassign from this client"
                >
                  Unassign
                </button>
              </div>
            ))}
          </div>
        )}
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
  const timeSeries = (s.timeSeries ?? []) as Array<Record<string, unknown>>;

  return {
    accountName: account?.name ?? "Meta Ads",
    spend: metrics?.spend ?? 0,
    revenue: metrics?.revenue ?? 0,
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
        id: c.id as string, name: c.name as string, status: c.status as string,
        spend: cm?.spend ?? 0, revenue: cm?.revenue ?? 0, impressions: cm?.impressions ?? 0,
        clicks: cm?.clicks ?? 0, conversions: cm?.conversions ?? 0, cpa: cm?.cpa ?? 0, roas: cm?.roas ?? 0, adSets: [],
      };
    }),
    creatives: [],
    timeSeries: timeSeries.map((ts) => ({ date: ts.date as string, metrics: ts.metrics as Record<string, number> })),
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
  const timeSeries = (s.timeSeries ?? []) as Array<Record<string, unknown>>;

  return {
    accountName: account?.name ?? "Google Ads",
    spend: metrics?.spend ?? 0, revenue: metrics?.revenue ?? 0, impressions: metrics?.impressions ?? 0,
    clicks: metrics?.clicks ?? 0, conversions: metrics?.conversions ?? 0, roas: metrics?.roas ?? 0,
    ctr: metrics?.ctr ?? 0, cpc: metrics?.cpc ?? 0, cpa: metrics?.cpa ?? 0,
    campaigns: campaigns.map((c) => {
      const cm = c.metrics as Record<string, number> | undefined;
      return {
        id: c.id as string, name: c.name as string, status: c.status as string,
        type: (c.objective as string) ?? "Search",
        spend: cm?.spend ?? 0, revenue: cm?.revenue ?? 0, impressions: cm?.impressions ?? 0,
        clicks: cm?.clicks ?? 0, conversions: cm?.conversions ?? 0, cpa: cm?.cpa ?? 0, roas: cm?.roas ?? 0, adGroups: [],
      };
    }),
    keywords: [],
    timeSeries: timeSeries.map((ts) => ({ date: ts.date as string, metrics: ts.metrics as Record<string, number> })),
    previousPeriod: prevMetrics
      ? { spend: prevMetrics.spend, conversions: prevMetrics.conversions, roas: prevMetrics.roas, cpa: prevMetrics.cpa }
      : undefined,
  };
}

function transformShopifyData(s: Record<string, unknown>) {
  const metrics = s.metrics as Record<string, number> | undefined;
  const prevMetrics = s.previousPeriodMetrics as Record<string, number> | undefined;
  const account = s.account as Record<string, string> | undefined;
  const timeSeries = (s.timeSeries ?? []) as Array<Record<string, unknown>>;

  return {
    storeName: account?.name ?? "Shopify Store",
    revenue: metrics?.revenue ?? 0, orders: metrics?.orders ?? 0, averageOrderValue: metrics?.averageOrderValue ?? 0,
    newCustomers: metrics?.newCustomers ?? 0, returningCustomers: metrics?.returningCustomers ?? 0,
    refunds: metrics?.refunds ?? 0, refundAmount: metrics?.refundAmount ?? 0,
    topProducts: ((s.topProducts ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: (p.id as string) ?? "", name: (p.name as string) ?? "", imageUrl: p.imageUrl as string | undefined,
      revenue: (p.revenue as number) ?? 0, unitsSold: (p.unitsSold as number) ?? 0,
    })),
    timeSeries: timeSeries.map((ts) => ({ date: ts.date as string, metrics: ts.metrics as { revenue: number; orders: number; averageOrderValue: number } })),
    previousPeriod: prevMetrics
      ? { revenue: prevMetrics.revenue, orders: prevMetrics.orders, averageOrderValue: prevMetrics.averageOrderValue, newCustomers: prevMetrics.newCustomers ?? 0 }
      : undefined,
  };
}
