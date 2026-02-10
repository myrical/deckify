"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MetaView } from "../../components/meta-view";
import { GoogleView } from "../../components/google-view";
import { ShopifyView } from "../../components/shopify-view";
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

type ActivePlatform = "meta" | "google" | "shopify";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<ActivePlatform | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ accountId: string; accountName: string; error: string; code: string; recoveryAction: string }>>([]);
  const [accountsFound, setAccountsFound] = useState<number | null>(null);

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
      const res = await fetch("/api/clients");
      if (res.ok) {
        const json = await res.json();
        const allC = (json.clients ?? []) as ClientDetail[];
        setAllClients(allC.map((c) => ({ id: c.id, name: c.name })));
        const found = allC.find((c) => c.id === clientId);
        if (found) {
          setClient(found);
          const platforms = [...new Set(found.adAccounts.map((a: AdAccountInfo) => a.platform))] as ActivePlatform[];
          if (platforms.length > 0 && !activePlatform) {
            setActivePlatform(platforms[0]);
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [clientId, activePlatform]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

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
      fetchAnalytics();
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
      fetchAnalytics();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <AnalyticsSkeleton variant="meta" />
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
        <AnalyticsSkeleton variant={activePlatform === "shopify" ? "shopify" : activePlatform === "google" ? "google" : "meta"} />
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
