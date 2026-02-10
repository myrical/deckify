"use client";

import { MetricCard } from "./metric-card";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface ShopifyViewData {
  storeName: string; revenue: number; orders: number; averageOrderValue: number; newCustomers: number; returningCustomers: number; refunds: number; refundAmount: number;
  topProducts: Array<{ id: string; name: string; imageUrl?: string; revenue: number; unitsSold: number; }>;
  previousPeriod?: { revenue: number; orders: number; averageOrderValue: number; newCustomers: number; };
  timeSeries?: Array<{ date: string; metrics: { revenue: number; orders: number; averageOrderValue: number } }>;
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function ShopifyView({ data }: { data?: ShopifyViewData }) {
  if (!data) return null;

  const prev = data.previousPeriod;

  const timeSeriesData = (data.timeSeries ?? []).map((ts) => ({
    date: ts.date,
    revenue: ts.metrics?.revenue ?? 0,
    orders: ts.metrics?.orders ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Revenue" value={fmt(data.revenue)} change={pctChange(data.revenue, prev?.revenue)} metricType="positive-up" size="md" />
        <MetricCard label="Orders" value={data.orders.toLocaleString()} change={pctChange(data.orders, prev?.orders)} metricType="positive-up" size="md" />
        <MetricCard label="AOV" value={fmt(data.averageOrderValue)} change={pctChange(data.averageOrderValue, prev?.averageOrderValue)} metricType="positive-up" size="md" />
        <MetricCard label="New Customers" value={data.newCustomers.toLocaleString()} change={pctChange(data.newCustomers, prev?.newCustomers)} metricType="positive-up" size="md" />
        <MetricCard label="Returning" value={data.returningCustomers.toLocaleString()} metricType="neutral" size="md" />
        <MetricCard label="Refunds" value={data.refunds + " (" + fmt(data.refundAmount) + ")"} metricType="negative-up" size="md" />
      </div>

      {/* Daily Revenue & Orders Chart */}
      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Daily Revenue & Orders</h3>
        </div>
        <div className="p-6">
          {timeSeriesData.length > 0 ? (
            <TimeSeriesChart
              data={timeSeriesData}
              metrics={[
                { key: "revenue", label: "Revenue", color: "var(--status-positive)", type: "bar", yAxisId: "left" },
                { key: "orders", label: "Orders", color: "var(--accent-secondary)", type: "line", yAxisId: "right" },
              ]}
              height={240}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg" style={{ background: "var(--bg-secondary)" }}>
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>No time series data available</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      {data.topProducts.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Products by Revenue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Units Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, idx) => (
                  <tr key={product.id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
                          {product.imageUrl ? (<img src={product.imageUrl} alt="" className="h-full w-full object-cover" />) : (<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>IMG</span>)}
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>{fmt(product.revenue)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{product.unitsSold}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{product.unitsSold > 0 ? fmt(product.revenue / product.unitsSold) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
