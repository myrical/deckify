"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleView } from "../components/google-view";
import { AnalyticsErrorBanner } from "../components/analytics-error-banner";

interface ClientOption {
  id: string;
  name: string;
}

interface AnalyticsError {
  accountId: string;
  accountName: string;
  error: string;
  code: string;
  recoveryAction: string;
}

export default function GoogleAdsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("client");

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<AnalyticsError[]>([]);
  const [accountsFound, setAccountsFound] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/data-sources?platform=google&status=assigned&limit=500");
        if (res.ok) {
          const json = await res.json();
          setClients(json.clients ?? []);
          if (!clientId && json.clients?.length > 0) {
            router.replace(`/dashboard/google?client=${json.clients[0].id}`);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, router]);

  const fetchAnalytics = useCallback(async () => {
    if (!clientId) return;
    setErrors([]);
    setAccountsFound(null);
    try {
      const res = await fetch(`/api/analytics?platform=google&clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setErrors(json.errors ?? []);
        setAccountsFound(json.accountsFound ?? 0);
        const summaries = json.data ?? [];
        if (summaries.length > 0) {
          const s = summaries[0];
          setAnalyticsData({
            accountName: s.account?.name ?? "Google Ads",
            spend: s.metrics?.spend ?? 0,
            revenue: s.metrics?.revenue ?? 0,
            impressions: s.metrics?.impressions ?? 0,
            clicks: s.metrics?.clicks ?? 0,
            conversions: s.metrics?.conversions ?? 0,
            roas: s.metrics?.roas ?? 0,
            ctr: s.metrics?.ctr ?? 0,
            cpc: s.metrics?.cpc ?? 0,
            cpa: s.metrics?.cpa ?? 0,
            campaigns: (s.campaigns ?? []).map((c: Record<string, unknown>) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              type: (c as Record<string, unknown>).objective ?? "Search",
              spend: (c.metrics as Record<string, unknown>)?.spend ?? 0,
              revenue: (c.metrics as Record<string, unknown>)?.revenue ?? 0,
              impressions: (c.metrics as Record<string, unknown>)?.impressions ?? 0,
              clicks: (c.metrics as Record<string, unknown>)?.clicks ?? 0,
              conversions: (c.metrics as Record<string, unknown>)?.conversions ?? 0,
              cpa: (c.metrics as Record<string, unknown>)?.cpa ?? 0,
              roas: (c.metrics as Record<string, unknown>)?.roas ?? 0,
              adGroups: [],
            })),
            keywords: [],
            timeSeries: (s.timeSeries ?? []).map((ts: Record<string, unknown>) => ({
              date: ts.date,
              metrics: ts.metrics,
            })),
            previousPeriod: s.previousPeriodMetrics
              ? {
                  spend: s.previousPeriodMetrics.spend,
                  conversions: s.previousPeriodMetrics.conversions,
                  roas: s.previousPeriodMetrics.roas,
                  cpa: s.previousPeriodMetrics.cpa,
                }
              : undefined,
          });
        } else {
          setAnalyticsData(null);
        }
      }
    } catch {
      // silent
    }
  }, [clientId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Google Ads</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Google Ads</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Search, Display & YouTube advertising performance.
          </p>
        </div>
        {clients.length > 0 && (
          <select
            value={clientId ?? ""}
            onChange={(e) => router.push(`/dashboard/google?client=${e.target.value}`)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)",
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {clients.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <p className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No clients have Google Ads data sources assigned.
          </p>
          <Link href="/dashboard/data-sources" className="text-sm" style={{ color: "var(--accent-primary)" }}>
            Assign data sources
          </Link>
        </div>
      ) : (
        <>
          <AnalyticsErrorBanner errors={errors} accountsFound={accountsFound} platform="Google" />
          {analyticsData ? (
            <GoogleView data={analyticsData as unknown as Parameters<typeof GoogleView>[0]["data"]} />
          ) : accountsFound !== null && accountsFound > 0 && errors.length > 0 ? null : (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {accountsFound === 0
                  ? "No Google Ads accounts assigned to this client."
                  : "No data available for this period."}
              </p>
              {accountsFound === 0 && (
                <Link href="/dashboard/data-sources" className="mt-2 text-sm" style={{ color: "var(--accent-primary)" }}>
                  Assign data sources
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
