/**
 * Shopify E-Commerce Connector
 *
 * Implements data source connector for Shopify stores.
 * Handles OAuth, order/revenue data, and product performance.
 */

import type {
  AdAccount,
  TokenSet,
  OAuthCallbackParams,
  DateRange,
  NormalizedEcommerceMetrics,
  NormalizedProduct,
  NormalizedEcommerceTimeSeries,
  EcommerceSummary,
} from "../types";
import {
  TokenExpiredError,
  ApiError,
  NetworkError,
} from "@/core/errors/types";

// ─── Shopify API Types ───────────────────────────────────────────────────────

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_refunds?: string;
  financial_status: string;
  customer?: {
    id: number;
    orders_count: number;
  };
  line_items: Array<{
    product_id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
}

interface ShopifyProduct {
  id: number;
  title: string;
  image?: { src: string };
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getShopifyConfig() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ApiError("Shopify", "SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

// ─── Helper: Safe Fetch ──────────────────────────────────────────────────────

async function shopifyFetch<T>(url: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    throw new NetworkError("Shopify", err);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new TokenExpiredError("Shopify");
    }
    const body = await response.text().catch(() => "");
    throw new ApiError("Shopify", `HTTP ${response.status}: ${body}`, response.status);
  }

  return response.json() as Promise<T>;
}

function formatDate(date: Date): string {
  return date.toISOString();
}

// ─── Connector Implementation ────────────────────────────────────────────────

export class ShopifyConnector {
  platform = "shopify" as const;

  getAuthUrl(redirectUri: string, state?: string, shop?: string): string {
    const { clientId } = getShopifyConfig();
    const scopes = "read_orders,read_products,read_customers,read_analytics";
    const shopDomain = shop ?? "SHOP_NAME.myshopify.com";
    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
    });
    return `https://${shopDomain}/admin/oauth/authorize?${params}`;
  }

  async authorize(params: OAuthCallbackParams & { shop: string }): Promise<TokenSet> {
    const { clientId, clientSecret } = getShopifyConfig();

    let response: Response;
    try {
      response = await fetch(`https://${params.shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: params.code,
        }),
      });
    } catch (err) {
      throw new NetworkError("Shopify", err);
    }

    if (!response.ok) {
      throw new ApiError("Shopify", `OAuth failed: HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as { access_token: string; scope: string };

    // Shopify offline access tokens don't expire
    return {
      accessToken: data.access_token,
      scopes: data.scope.split(","),
      platform: "shopify",
    };
  }

  async getShopInfo(shop: string, tokenSet: TokenSet): Promise<AdAccount> {
    const result = await shopifyFetch<{
      shop: { id: number; name: string; currency: string; iana_timezone: string };
    }>(`https://${shop}/admin/api/2024-10/shop.json`, tokenSet.accessToken);

    return {
      id: String(result.shop.id),
      name: result.shop.name,
      platform: "shopify",
      currency: result.shop.currency,
      timezone: result.shop.iana_timezone,
      status: "active",
    };
  }

  async fetchEcommerceSummary(
    shop: string,
    tokenSet: TokenSet,
    dateRange: DateRange
  ): Promise<EcommerceSummary> {
    const [orders, account] = await Promise.all([
      this.fetchOrders(shop, tokenSet, dateRange),
      this.getShopInfo(shop, tokenSet),
    ]);

    const metrics = this.computeMetrics(orders, dateRange);
    const topProducts = this.computeTopProducts(orders);
    const timeSeries = this.computeTimeSeries(orders, dateRange);

    // Previous period
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousDateRange: DateRange = {
      start: new Date(dateRange.start.getTime() - periodLength),
      end: new Date(dateRange.start.getTime() - 1),
    };

    let previousPeriodMetrics: NormalizedEcommerceMetrics | undefined;
    try {
      const prevOrders = await this.fetchOrders(shop, tokenSet, previousDateRange);
      previousPeriodMetrics = this.computeMetrics(prevOrders, previousDateRange);
    } catch {
      // Previous period not available
    }

    return {
      account,
      metrics,
      previousPeriodMetrics,
      topProducts,
      timeSeries,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async fetchOrders(
    shop: string,
    tokenSet: TokenSet,
    dateRange: DateRange
  ): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let url: string | null =
      `https://${shop}/admin/api/2024-10/orders.json?status=any&created_at_min=${formatDate(dateRange.start)}&created_at_max=${formatDate(dateRange.end)}&limit=250`;

    while (url) {
      const result = await shopifyFetch<{ orders: ShopifyOrder[] }>(url, tokenSet.accessToken);
      allOrders.push(...result.orders);

      // Shopify pagination is via Link header — simplified here
      if (result.orders.length < 250) {
        url = null;
      } else {
        // In production, parse the Link header for next page URL
        url = null; // Stop after first page for safety
      }
    }

    return allOrders;
  }

  private computeMetrics(orders: ShopifyOrder[], dateRange: DateRange): NormalizedEcommerceMetrics {
    let revenue = 0;
    let refundAmount = 0;
    let refunds = 0;
    const customerIds = new Set<number>();
    let newCustomers = 0;
    let returningCustomers = 0;

    for (const order of orders) {
      revenue += parseFloat(order.total_price);
      if (order.financial_status === "refunded" || order.financial_status === "partially_refunded") {
        refunds++;
        refundAmount += parseFloat(order.total_refunds ?? "0");
      }
      if (order.customer) {
        customerIds.add(order.customer.id);
        if (order.customer.orders_count <= 1) {
          newCustomers++;
        } else {
          returningCustomers++;
        }
      }
    }

    return {
      revenue,
      orders: orders.length,
      averageOrderValue: orders.length > 0 ? revenue / orders.length : 0,
      refunds,
      refundAmount,
      newCustomers,
      returningCustomers,
      conversionRate: 0, // requires traffic data not available from orders API alone
      dateRange,
    };
  }

  private computeTopProducts(orders: ShopifyOrder[]): NormalizedProduct[] {
    const productMap = new Map<number, { name: string; revenue: number; units: number }>();

    for (const order of orders) {
      for (const item of order.line_items) {
        const existing = productMap.get(item.product_id) ?? {
          name: item.title,
          revenue: 0,
          units: 0,
        };
        existing.revenue += parseFloat(item.price) * item.quantity;
        existing.units += item.quantity;
        productMap.set(item.product_id, existing);
      }
    }

    return Array.from(productMap.entries())
      .map(([id, data]) => ({
        id: String(id),
        name: data.name,
        revenue: data.revenue,
        unitsSold: data.units,
        refundRate: 0, // would need refund line items to compute
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private computeTimeSeries(
    orders: ShopifyOrder[],
    dateRange: DateRange
  ): NormalizedEcommerceTimeSeries[] {
    const dateMap = new Map<string, ShopifyOrder[]>();

    for (const order of orders) {
      const date = order.created_at.split("T")[0];
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date)!.push(order);
    }

    // Fill in missing dates with zeros
    const series: NormalizedEcommerceTimeSeries[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dateStr = current.toISOString().split("T")[0];
      const dayOrders = dateMap.get(dateStr) ?? [];
      series.push({
        date: dateStr,
        metrics: this.computeMetrics(dayOrders, {
          start: new Date(dateStr),
          end: new Date(dateStr),
        }),
      });
      current.setDate(current.getDate() + 1);
    }

    return series;
  }
}
