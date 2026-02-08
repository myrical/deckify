"use client";

import { MetricCard } from "./metric-card";

interface ShopifyViewData {
  storeName: string; revenue: number; orders: number; averageOrderValue: number; newCustomers: number; returningCustomers: number; refunds: number; refundAmount: number;
  topProducts: Array<{ id: string; name: string; imageUrl?: string; revenue: number; unitsSold: number; }>;
  previousPeriod?: { revenue: number; orders: number; averageOrderValue: number; newCustomers: number; };
}

function pctChange(current: number, previous?: number): number | undefined { if (previous === undefined || previous === 0) return undefined; return ((current - previous) / previous) * 100; }
function trend(change?: number): "up" | "down" | "flat" | undefined { if (change === undefined) return undefined; return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat"; }
function fmt(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function ShopifyView({ data }: { data?: ShopifyViewData }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-xl py-16" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(150, 191, 72, 0.1)" }}>
            <svg viewBox="0 0 24 24" fill="#96BF48" className="h-6 w-6"><path d="M15.34 2.61a.26.26 0 0 0-.24-.21 2.2 2.2 0 0 0-.49 0s-1 .3-1.36.4a4 4 0 0 0-.27-.69A2 2 0 0 0 11.24 1c-.09 0-.69 0-1.34.86a5 5 0 0 0-.81 2.38l-1.56.48a.85.85 0 0 0-.54.56c-.06.18-1.41 10.86-1.41 10.86L11.73 17l6-1.3s-2.36-12.92-2.39-13.09Z" /><path d="m17.55 15.63-6 1.3.85 4.14 5.42-1.17-.27-4.27Z" /></svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Connect your Shopify store</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>to see revenue and order data</p>
        </div>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Revenue" value={fmt(data.revenue)} change={pctChange(data.revenue, prev?.revenue)} trend={trend(pctChange(data.revenue, prev?.revenue))} size="md" />
        <MetricCard label="Orders" value={data.orders.toLocaleString()} change={pctChange(data.orders, prev?.orders)} trend={trend(pctChange(data.orders, prev?.orders))} size="md" />
        <MetricCard label="AOV" value={fmt(data.averageOrderValue)} change={pctChange(data.averageOrderValue, prev?.averageOrderValue)} trend={trend(pctChange(data.averageOrderValue, prev?.averageOrderValue))} size="md" />
        <MetricCard label="New Customers" value={data.newCustomers.toLocaleString()} change={pctChange(data.newCustomers, prev?.newCustomers)} trend={trend(pctChange(data.newCustomers, prev?.newCustomers))} size="md" />
        <MetricCard label="Returning" value={data.returningCustomers.toLocaleString()} size="md" />
        <MetricCard label="Refunds" value={data.refunds + " (" + fmt(data.refundAmount) + ")"} size="md" />
      </div>

      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}><h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Top Products by Revenue</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: "var(--bg-secondary)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Product</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Units Sold</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Avg Price</th>
            </tr></thead>
            <tbody>{data.topProducts.map((product, idx) => (
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
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Daily Revenue</h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Revenue + orders line chart</span>
        </div>
      </div>
    </div>
  );
}
