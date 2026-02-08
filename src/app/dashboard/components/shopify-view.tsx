"use client";

import { MetricCard } from "./metric-card";

interface ShopifyViewData {
  storeName: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
  refunds: number;
  refundAmount: number;
  topProducts: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    revenue: number;
    unitsSold: number;
  }>;
  previousPeriod?: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    newCustomers: number;
  };
}

function pctChange(current: number, previous?: number): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function trend(change?: number): "up" | "down" | "flat" | undefined {
  if (change === undefined) return undefined;
  return change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";
}

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ShopifyView({ data }: { data?: ShopifyViewData }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Connect your Shopify store to see revenue and order data.
        </p>
      </div>
    );
  }

  const prev = data.previousPeriod;

  return (
    <div className="space-y-6">
      {/* Store KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Revenue" value={fmt(data.revenue)} change={pctChange(data.revenue, prev?.revenue)} trend={trend(pctChange(data.revenue, prev?.revenue))} size="md" />
        <MetricCard label="Orders" value={data.orders.toLocaleString()} change={pctChange(data.orders, prev?.orders)} trend={trend(pctChange(data.orders, prev?.orders))} size="md" />
        <MetricCard label="AOV" value={fmt(data.averageOrderValue)} change={pctChange(data.averageOrderValue, prev?.averageOrderValue)} trend={trend(pctChange(data.averageOrderValue, prev?.averageOrderValue))} size="md" />
        <MetricCard label="New Customers" value={data.newCustomers.toLocaleString()} change={pctChange(data.newCustomers, prev?.newCustomers)} trend={trend(pctChange(data.newCustomers, prev?.newCustomers))} size="md" />
        <MetricCard label="Returning" value={data.returningCustomers.toLocaleString()} size="md" />
        <MetricCard label="Refunds" value={`${data.refunds} (${fmt(data.refundAmount)})`} size="md" />
      </div>

      {/* Top Products */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Top Products by Revenue
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Product</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Units Sold</th>
                <th className="px-4 py-3 text-right">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product, idx) => (
                <tr
                  key={product.id}
                  className={`border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">IMG</span>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(product.revenue)}</td>
                  <td className="px-4 py-3 text-right">{product.unitsSold}</td>
                  <td className="px-4 py-3 text-right">
                    {product.unitsSold > 0 ? fmt(product.revenue / product.unitsSold) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Time Series Placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Daily Revenue
        </h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-gray-50">
          <span className="text-sm text-gray-400">Revenue + orders line chart</span>
        </div>
      </div>
    </div>
  );
}
