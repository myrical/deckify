"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleView } from "../components/google-view";
import { AnalyticsErrorBanner } from "../components/analytics-error-banner";
import { AnalyticsSkeleton } from "../components/loading-skeleton";

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
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
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
    setAnalyticsLoading(true);
    setAnalyticsData(null);
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
          const m = s.metrics ?? {};
          setAnalyticsData({
            accountName: s.account?.name ?? "Google Ads",
            spend: m.spend ?? 0,
            revenue: m.revenue ?? 0,
            impressions: m.impressions ?? 0,
            clicks: m.clicks ?? 0,
            conversions: m.conversions ?? 0,
            roas: m.roas ?? 0,
            ctr: m.ctr ?? 0,
            cpc: m.cpc ?? 0,
            cpa: m.cpa ?? 0,
            campaigns: (s.campaigns ?? []).map((c: Record<string, unknown>) => {
              const cm = c.metrics as Record<string, number> | undefined;
              return {
                id: c.id,
                name: c.name,
                status: c.status,
                type: (c as Record<string, unknown>).objective ?? "Search",
                spend: cm?.spend ?? 0,
                revenue: cm?.revenue ?? 0,
                impressions: cm?.impressions ?? 0,
                clicks: cm?.clicks ?? 0,
                conversions: cm?.conversions ?? 0,
                cpa: cm?.cpa ?? 0,
                roas: cm?.roas ?? 0,
                adGroups: [],
              };
            }),
            keywords: [],
            timeSeries: (s.timeSeries ?? []).map((ts: Record<string, unknown>) => {
              const tm = ts.metrics as Record<string, number> | undefined;
              return {
                date: ts.date as string,
                spend: tm?.spend ?? 0,
                revenue: tm?.revenue ?? 0,
                roas: tm?.roas ?? 0,
              };
            }),
            previousPeriod: s.previousPeriodMetrics
              ? {
                  spend: s.previousPeriodMetrics.spend,
                  conversions: s.previousPeriodMetrics.conversions,
                  roas: s.previousPeriodMetrics.roas,
                  cpa: s.previousPeriodMetrics.cpa,
                  revenue: s.previousPeriodMetrics.revenue,
                }
              : undefined,
          });
        } else {
          setAnalyticsData(null);
        }
      }
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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

      {loading || analyticsLoading ? (
        <AnalyticsSkeleton variant="google" />
      ) : clients.length === 0 ? (
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
