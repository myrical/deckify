import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOverviewByClient, type ClientOverview } from "@/lib/analytics";

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function ClientCard({ data }: { data: ClientOverview }) {
  const { client, platforms, totalSpend, totalRevenue } = data;
  const hasData = totalSpend > 0 || totalRevenue > 0;

  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="group block rounded-xl p-5 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {client.name}
        </h3>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          width="16"
          height="16"
          className="transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
        </svg>
      </div>

      {hasData ? (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="flex gap-4">
            {totalSpend > 0 && (
              <div>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Total Spend</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{fmt(totalSpend)}</p>
              </div>
            )}
            {totalRevenue > 0 && (
              <div>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Revenue</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{fmt(totalRevenue)}</p>
              </div>
            )}
            {totalSpend > 0 && totalRevenue > 0 && (
              <div>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>ROAS</p>
                <p className="text-lg font-bold" style={{ color: "var(--status-positive)" }}>
                  {(totalRevenue / totalSpend).toFixed(2)}x
                </p>
              </div>
            )}
          </div>

          {/* Platform breakdown */}
          <div className="flex flex-wrap gap-2">
            {platforms.meta && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "#1877F218", color: "#1877F2" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#1877F2" }} />
                Meta: {fmt(platforms.meta.spend)}
              </span>
            )}
            {platforms.google && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "#4285F418", color: "#4285F4" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#4285F4" }} />
                Google: {fmt(platforms.google.spend)}
              </span>
            )}
            {platforms.shopify && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "#96BF4818", color: "#96BF48" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#96BF48" }} />
                Shopify: {platforms.shopify.orders} orders
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No analytics data yet for this period.
        </p>
      )}
    </Link>
  );
}

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  let clientOverviews: ClientOverview[] = [];

  if (session?.user?.id) {
    const membership = await db.orgMembership.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) {
      try {
        clientOverviews = await getOverviewByClient(membership.orgId);
      } catch (err) {
        console.error("[Overview] Failed to fetch analytics:", err);
      }
    }
  }

  const hasClients = clientOverviews.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Overview</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {hasClients
            ? `${clientOverviews.length} client${clientOverviews.length !== 1 ? "s" : ""} — last 7 days. Select a client to view analytics.`
            : "Your client performance at a glance."}
        </p>
      </div>

      {hasClients ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {clientOverviews.map((co) => (
            <ClientCard key={co.client.id} data={co} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-primary-light)" }}
          >
            <svg viewBox="0 0 20 20" fill="var(--accent-primary)" width="24" height="24">
              <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13A1.5 1.5 0 0 0 15.5 18h1A1.5 1.5 0 0 0 18 16.5v-13A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9A1.5 1.5 0 0 0 9.5 18h1A1.5 1.5 0 0 0 12 16.5v-9A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5A1.5 1.5 0 0 0 3.5 18h1A1.5 1.5 0 0 0 6 16.5v-5A1.5 1.5 0 0 0 4.5 10h-1Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            No analytics yet
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Connect a platform, then assign data sources to a client to start seeing analytics here.
          </p>
          <div className="flex gap-3">
            <Link
              href="/dashboard/connections"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent-primary)" }}
            >
              Connect a Platform
            </Link>
            <Link
              href="/dashboard/data-sources"
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              Manage Data Sources
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
