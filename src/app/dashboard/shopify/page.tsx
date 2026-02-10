"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShopifyView } from "../components/shopify-view";
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

export default function ShopifyPage() {
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
        const res = await fetch("/api/data-sources?platform=shopify&status=assigned&limit=500");
        if (res.ok) {
          const json = await res.json();
          setClients(json.clients ?? []);
          if (!clientId && json.clients?.length > 0) {
            router.replace(`/dashboard/shopify?client=${json.clients[0].id}`);
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
      const res = await fetch(`/api/analytics?platform=shopify&clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setErrors(json.errors ?? []);
        setAccountsFound(json.accountsFound ?? 0);
        const summaries = json.data ?? [];
        if (summaries.length > 0) {
          const s = summaries[0];
          setAnalyticsData({
            storeName: s.account?.name ?? "Shopify Store",
            revenue: s.metrics?.revenue ?? 0,
            orders: s.metrics?.orders ?? 0,
            averageOrderValue: s.metrics?.averageOrderValue ?? 0,
            newCustomers: s.metrics?.newCustomers ?? 0,
            returningCustomers: s.metrics?.returningCustomers ?? 0,
            refunds: s.metrics?.refunds ?? 0,
            refundAmount: s.metrics?.refundAmount ?? 0,
            topProducts: (s.topProducts ?? []).map((p: Record<string, unknown>) => ({
              id: (p.id as string) ?? "",
              name: (p.name as string) ?? "",
              imageUrl: p.imageUrl as string | undefined,
              revenue: (p.revenue as number) ?? 0,
              unitsSold: (p.unitsSold as number) ?? 0,
            })),
            timeSeries: (s.timeSeries ?? []).map((ts: Record<string, unknown>) => ({
              date: ts.date,
              metrics: ts.metrics,
            })),
            previousPeriod: s.previousPeriodMetrics
              ? {
                  revenue: s.previousPeriodMetrics.revenue,
                  orders: s.previousPeriodMetrics.orders,
                  averageOrderValue: s.previousPeriodMetrics.averageOrderValue,
                  newCustomers: s.previousPeriodMetrics.newCustomers ?? 0,
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
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Shopify</h1>
        <div className="mt-4">
          <AnalyticsSkeleton variant="shopify" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Shopify</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            E-commerce store performance & analytics.
          </p>
        </div>
        {clients.length > 0 && (
          <select
            value={clientId ?? ""}
            onChange={(e) => router.push(`/dashboard/shopify?client=${e.target.value}`)}
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
            No clients have Shopify data sources assigned.
          </p>
          <Link href="/dashboard/data-sources" className="text-sm" style={{ color: "var(--accent-primary)" }}>
            Assign data sources
          </Link>
        </div>
      ) : (
        <>
          <AnalyticsErrorBanner errors={errors} accountsFound={accountsFound} platform="Shopify" />
          {analyticsData ? (
            <ShopifyView data={analyticsData as unknown as Parameters<typeof ShopifyView>[0]["data"]} />
          ) : accountsFound !== null && accountsFound > 0 && errors.length > 0 ? null : (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {accountsFound === 0
                  ? "No Shopify stores assigned to this client."
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
