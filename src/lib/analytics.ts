/**
 * Server-side analytics data fetching.
 *
 * Queries the DB for a client's ad accounts, uses the stored tokens
 * to call each platform's connector, and returns normalized data
 * in the shapes expected by the view components.
 */

import { db } from "@/lib/db";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { GoogleAdsConnector } from "@/core/ad-platforms/google-ads";
import { ShopifyConnector } from "@/core/ad-platforms/shopify";
import type {
  DateRange,
  AccountSummary,
  EcommerceSummary,
  AdPlatform,
} from "@/core/ad-platforms/types";
import { PrismError } from "@/core/errors/types";

/* ------------------------------------------------------------------ */
/*  Types for view components                                          */
/* ------------------------------------------------------------------ */

export interface AnalyticsError {
  accountId: string;
  accountName: string;
  error: string;
  code: string;
  recoveryAction: string;
}

export interface AnalyticsResult<T> {
  data: T[];
  errors: AnalyticsError[];
  accountsFound: number;
}

export interface AllPlatformsAnalyticsResult {
  totalSpend: number;
  totalRevenue: number;
  mer: number;
  roas: number;
  platforms: {
    meta?: { spend: number; revenue: number; conversions: number; roas: number };
    google?: { spend: number; revenue: number; conversions: number; roas: number };
    shopify?: { revenue: number; orders: number };
  };
  previousPeriod?: {
    totalSpend: number;
    totalRevenue: number;
    mer: number;
    roas: number;
  };
  timeSeries: Array<{ date: string; spend: number; revenue: number }>;
  errors: AnalyticsError[];
  accountsFound: number;
}

export interface ClientOverview {
  client: { id: string; name: string };
  platforms: {
    meta?: { spend: number; conversions: number; roas: number };
    google?: { spend: number; conversions: number; roas: number };
    shopify?: { revenue: number; orders: number };
  };
  totalSpend: number;
  totalRevenue: number;
}

const ACCOUNT_FETCH_CONCURRENCY = 4;
const ACCOUNT_FETCH_TIMEOUT_MS = 12000;

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function mapSettledWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  if (items.length === 0) return [];
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        const value = await mapper(items[index], index);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Default date range (last 7 days)                                   */
/* ------------------------------------------------------------------ */

export function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { start, end };
}

/* ------------------------------------------------------------------ */
/*  Overview: client-by-client summary                                 */
/* ------------------------------------------------------------------ */

export async function getOverviewByClient(orgId: string): Promise<ClientOverview[]> {
  const clients = await db.client.findMany({
    where: { orgId },
    include: {
      adAccounts: {
        where: { isActive: true },
        include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true, platform: true, platformMeta: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const dateRange = defaultDateRange();
  const results: ClientOverview[] = [];

  for (const client of clients) {
    const overview: ClientOverview = {
      client: { id: client.id, name: client.name },
      platforms: {},
      totalSpend: 0,
      totalRevenue: 0,
    };

    // Group accounts by platform
    const byPlatform = new Map<string, typeof client.adAccounts>();
    for (const acc of client.adAccounts) {
      const list = byPlatform.get(acc.platform) ?? [];
      list.push(acc);
      byPlatform.set(acc.platform, list);
    }

    // Meta
    const metaAccounts = byPlatform.get("meta") ?? [];
    if (metaAccounts.length > 0) {
      let totalSpend = 0, totalConv = 0, totalRev = 0;
      const settled = await mapSettledWithConcurrency(
        metaAccounts,
        ACCOUNT_FETCH_CONCURRENCY,
        async (acc) => {
          const connector = new MetaAdsConnector();
          return await withTimeout(
            connector.fetchAccountSummary({
              accountId: acc.platformId,
              tokenSet: {
                accessToken: acc.platformAuth.accessToken,
                refreshToken: acc.platformAuth.refreshToken ?? undefined,
                scopes: acc.platformAuth.scopes,
                platform: "meta",
              },
              dateRange,
              level: "account",
              metrics: ["spend", "conversions", "roas"],
            }),
            ACCOUNT_FETCH_TIMEOUT_MS,
            `Meta analytics timed out for account ${acc.platformId}`,
          );
        },
      );
      for (const entry of settled) {
        if (entry.status === "fulfilled") {
          const summary = entry.value;
          totalSpend += summary.metrics.spend;
          totalConv += summary.metrics.conversions;
          totalRev += summary.metrics.revenue;
        } else {
          console.error("[Analytics] Meta fetch failed in overview:", entry.reason);
        }
      }
      if (totalSpend > 0 || totalConv > 0) {
        overview.platforms.meta = {
          spend: totalSpend,
          conversions: totalConv,
          roas: totalSpend > 0 ? totalRev / totalSpend : 0,
        };
        overview.totalSpend += totalSpend;
      }
    }

    // Google
    const googleAccounts = byPlatform.get("google") ?? [];
    if (googleAccounts.length > 0) {
      let totalSpend = 0, totalConv = 0, totalRev = 0;
      const settled = await mapSettledWithConcurrency(
        googleAccounts,
        ACCOUNT_FETCH_CONCURRENCY,
        async (acc) => {
          const connector = new GoogleAdsConnector();
          const managerMap = (acc.platformAuth.platformMeta as { managerMap?: Record<string, string> })?.managerMap;
          const loginCustomerId = managerMap?.[acc.platformId];
          return await withTimeout(
            connector.fetchAccountSummary({
              accountId: acc.platformId,
              tokenSet: {
                accessToken: acc.platformAuth.accessToken,
                refreshToken: acc.platformAuth.refreshToken ?? undefined,
                scopes: acc.platformAuth.scopes,
                platform: "google",
              },
              dateRange,
              loginCustomerId,
              level: "account",
              metrics: ["spend", "conversions", "roas"],
            }),
            ACCOUNT_FETCH_TIMEOUT_MS,
            `Google analytics timed out for account ${acc.platformId}`,
          );
        },
      );
      for (const entry of settled) {
        if (entry.status === "fulfilled") {
          const summary = entry.value;
          totalSpend += summary.metrics.spend;
          totalConv += summary.metrics.conversions;
          totalRev += summary.metrics.revenue;
        } else {
          console.error("[Analytics] Google fetch failed in overview:", entry.reason);
        }
      }
      if (totalSpend > 0 || totalConv > 0) {
        overview.platforms.google = {
          spend: totalSpend,
          conversions: totalConv,
          roas: totalSpend > 0 ? totalRev / totalSpend : 0,
        };
        overview.totalSpend += totalSpend;
      }
    }

    // Shopify
    const shopifyAccounts = byPlatform.get("shopify") ?? [];
    if (shopifyAccounts.length > 0) {
      let totalRevenue = 0, totalOrders = 0;
      const settled = await mapSettledWithConcurrency(
        shopifyAccounts,
        ACCOUNT_FETCH_CONCURRENCY,
        async (acc) => {
          const connector = new ShopifyConnector();
          const shop = (acc.platformAuth.platformMeta as { shop?: string })?.shop ?? acc.platformId;
          return await withTimeout(
            connector.fetchEcommerceSummary(
              shop,
              {
                accessToken: acc.platformAuth.accessToken,
                refreshToken: acc.platformAuth.refreshToken ?? undefined,
                scopes: acc.platformAuth.scopes,
                platform: "shopify",
              },
              dateRange,
            ),
            ACCOUNT_FETCH_TIMEOUT_MS,
            `Shopify analytics timed out for account ${acc.platformId}`,
          );
        },
      );
      for (const entry of settled) {
        if (entry.status === "fulfilled") {
          const summary = entry.value;
          totalRevenue += summary.metrics.revenue;
          totalOrders += summary.metrics.orders;
        } else {
          console.error("[Analytics] Shopify fetch failed in overview:", entry.reason);
        }
      }
      if (totalRevenue > 0 || totalOrders > 0) {
        overview.platforms.shopify = { revenue: totalRevenue, orders: totalOrders };
        overview.totalRevenue += totalRevenue;
      }
    }

    results.push(overview);
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Per-platform analytics for a single client                         */
/* ------------------------------------------------------------------ */

export async function getMetaAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<AnalyticsResult<AccountSummary>> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "meta", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true } } },
  });

  const settled = await mapSettledWithConcurrency(
    accounts,
    ACCOUNT_FETCH_CONCURRENCY,
    async (acc) => {
      const connector = new MetaAdsConnector();
      return await withTimeout(
        connector.fetchAccountSummary({
          accountId: acc.platformId,
          tokenSet: {
            accessToken: acc.platformAuth.accessToken,
            refreshToken: acc.platformAuth.refreshToken ?? undefined,
            scopes: acc.platformAuth.scopes,
            platform: "meta",
          },
          dateRange: range,
          level: "account",
          metrics: ["spend", "impressions", "clicks", "conversions", "revenue", "roas", "ctr", "cpc", "cpm", "cpa"],
        }),
        ACCOUNT_FETCH_TIMEOUT_MS,
        `Meta analytics timed out for account ${acc.platformId}`,
      );
    },
  );

  const summaries: AccountSummary[] = [];
  const errors: AnalyticsError[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const acc = accounts[i];
    if (result.status === "fulfilled") {
      summaries.push(result.value);
      continue;
    }
    console.error(`[Analytics] Meta fetch failed for ${acc.platformId}:`, result.reason);
    errors.push(toAnalyticsError(acc.platformId, acc.name, result.reason));
  }
  return { data: summaries, errors, accountsFound: accounts.length };
}

export async function getGoogleAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<AnalyticsResult<AccountSummary>> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "google", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true, platformMeta: true } } },
  });

  const settled = await mapSettledWithConcurrency(
    accounts,
    ACCOUNT_FETCH_CONCURRENCY,
    async (acc) => {
      const connector = new GoogleAdsConnector();
      const managerMap = (acc.platformAuth.platformMeta as { managerMap?: Record<string, string> })?.managerMap;
      const loginCustomerId = managerMap?.[acc.platformId];
      return await withTimeout(
        connector.fetchAccountSummary({
          accountId: acc.platformId,
          tokenSet: {
            accessToken: acc.platformAuth.accessToken,
            refreshToken: acc.platformAuth.refreshToken ?? undefined,
            scopes: acc.platformAuth.scopes,
            platform: "google",
          },
          dateRange: range,
          loginCustomerId,
          level: "account",
          metrics: ["spend", "impressions", "clicks", "conversions", "revenue", "roas", "ctr", "cpc", "cpm", "cpa"],
        }),
        ACCOUNT_FETCH_TIMEOUT_MS,
        `Google analytics timed out for account ${acc.platformId}`,
      );
    },
  );

  const summaries: AccountSummary[] = [];
  const errors: AnalyticsError[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const acc = accounts[i];
    if (result.status === "fulfilled") {
      summaries.push(result.value);
      continue;
    }
    console.error(`[Analytics] Google fetch failed for ${acc.platformId}:`, result.reason);
    errors.push(toAnalyticsError(acc.platformId, acc.name, result.reason));
  }
  return { data: summaries, errors, accountsFound: accounts.length };
}

export async function getShopifyAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<AnalyticsResult<EcommerceSummary>> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "shopify", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true, platformMeta: true } } },
  });

  const settled = await mapSettledWithConcurrency(
    accounts,
    ACCOUNT_FETCH_CONCURRENCY,
    async (acc) => {
      const connector = new ShopifyConnector();
      const shop = (acc.platformAuth.platformMeta as { shop?: string })?.shop ?? acc.platformId;
      return await withTimeout(
        connector.fetchEcommerceSummary(
          shop,
          {
            accessToken: acc.platformAuth.accessToken,
            refreshToken: acc.platformAuth.refreshToken ?? undefined,
            scopes: acc.platformAuth.scopes,
            platform: "shopify",
          },
          range,
        ),
        ACCOUNT_FETCH_TIMEOUT_MS,
        `Shopify analytics timed out for account ${acc.platformId}`,
      );
    },
  );

  const summaries: EcommerceSummary[] = [];
  const errors: AnalyticsError[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const acc = accounts[i];
    if (result.status === "fulfilled") {
      summaries.push(result.value);
      continue;
    }
    console.error(`[Analytics] Shopify fetch failed for ${acc.platformId}:`, result.reason);
    errors.push(toAnalyticsError(acc.platformId, acc.name, result.reason));
  }
  return { data: summaries, errors, accountsFound: accounts.length };
}

export async function getAllPlatformsAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<AllPlatformsAnalyticsResult> {
  const [meta, google, shopify] = await Promise.all([
    getMetaAnalytics(clientId, dateRange),
    getGoogleAnalytics(clientId, dateRange),
    getShopifyAnalytics(clientId, dateRange),
  ]);

  const byDate = new Map<string, { spend: number; adRevenue: number; shopifyRevenue: number }>();

  const mergeAdTimeSeries = (summaries: AccountSummary[]) => {
    for (const summary of summaries) {
      for (const row of summary.timeSeries) {
        const existing = byDate.get(row.date) ?? { spend: 0, adRevenue: 0, shopifyRevenue: 0 };
        existing.spend += row.metrics.spend ?? 0;
        existing.adRevenue += row.metrics.revenue ?? 0;
        byDate.set(row.date, existing);
      }
    }
  };

  const mergeShopifyTimeSeries = (summaries: EcommerceSummary[]) => {
    for (const summary of summaries) {
      for (const row of summary.timeSeries) {
        const existing = byDate.get(row.date) ?? { spend: 0, adRevenue: 0, shopifyRevenue: 0 };
        existing.shopifyRevenue += row.metrics.revenue ?? 0;
        byDate.set(row.date, existing);
      }
    }
  };

  mergeAdTimeSeries(meta.data);
  mergeAdTimeSeries(google.data);
  mergeShopifyTimeSeries(shopify.data);

  const metaSpend = meta.data.reduce((sum, s) => sum + s.metrics.spend, 0);
  const metaRevenue = meta.data.reduce((sum, s) => sum + s.metrics.revenue, 0);
  const metaConversions = meta.data.reduce((sum, s) => sum + s.metrics.conversions, 0);
  const googleSpend = google.data.reduce((sum, s) => sum + s.metrics.spend, 0);
  const googleRevenue = google.data.reduce((sum, s) => sum + s.metrics.revenue, 0);
  const googleConversions = google.data.reduce((sum, s) => sum + s.metrics.conversions, 0);
  const shopifyRevenue = shopify.data.reduce((sum, s) => sum + s.metrics.revenue, 0);
  const shopifyOrders = shopify.data.reduce((sum, s) => sum + s.metrics.orders, 0);

  const prevMetaSpend = meta.data.reduce((sum, s) => sum + (s.previousPeriodMetrics?.spend ?? 0), 0);
  const prevMetaRevenue = meta.data.reduce((sum, s) => sum + (s.previousPeriodMetrics?.revenue ?? 0), 0);
  const prevGoogleSpend = google.data.reduce((sum, s) => sum + (s.previousPeriodMetrics?.spend ?? 0), 0);
  const prevGoogleRevenue = google.data.reduce((sum, s) => sum + (s.previousPeriodMetrics?.revenue ?? 0), 0);
  const prevShopifyRevenue = shopify.data.reduce((sum, s) => sum + (s.previousPeriodMetrics?.revenue ?? 0), 0);
  const hasPrevious =
    meta.data.some((s) => !!s.previousPeriodMetrics)
    || google.data.some((s) => !!s.previousPeriodMetrics)
    || shopify.data.some((s) => !!s.previousPeriodMetrics);

  const totalSpend = metaSpend + googleSpend;
  const totalRevenue = shopifyRevenue > 0 ? shopifyRevenue : (metaRevenue + googleRevenue);
  const mer = totalRevenue > 0 ? (totalSpend / totalRevenue) * 100 : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const prevTotalSpend = prevMetaSpend + prevGoogleSpend;
  const prevTotalRevenue = prevShopifyRevenue > 0 ? prevShopifyRevenue : (prevMetaRevenue + prevGoogleRevenue);

  return {
    totalSpend,
    totalRevenue,
    mer,
    roas,
    platforms: {
      ...(metaSpend > 0 || metaRevenue > 0 || metaConversions > 0
        ? { meta: { spend: metaSpend, revenue: metaRevenue, conversions: metaConversions, roas: metaSpend > 0 ? metaRevenue / metaSpend : 0 } }
        : {}),
      ...(googleSpend > 0 || googleRevenue > 0 || googleConversions > 0
        ? { google: { spend: googleSpend, revenue: googleRevenue, conversions: googleConversions, roas: googleSpend > 0 ? googleRevenue / googleSpend : 0 } }
        : {}),
      ...(shopifyRevenue > 0 || shopifyOrders > 0
        ? { shopify: { revenue: shopifyRevenue, orders: shopifyOrders } }
        : {}),
    },
    previousPeriod: hasPrevious
      ? {
        totalSpend: prevTotalSpend,
        totalRevenue: prevTotalRevenue,
        mer: prevTotalRevenue > 0 ? (prevTotalSpend / prevTotalRevenue) * 100 : 0,
        roas: prevTotalSpend > 0 ? prevTotalRevenue / prevTotalSpend : 0,
      }
      : undefined,
    timeSeries: [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        spend: vals.spend,
        revenue: shopifyRevenue > 0 ? vals.shopifyRevenue : vals.adRevenue,
      })),
    errors: [...meta.errors, ...google.errors, ...shopify.errors],
    accountsFound: meta.accountsFound + google.accountsFound + shopify.accountsFound,
  };
}

/* ------------------------------------------------------------------ */
/*  Error helper                                                       */
/* ------------------------------------------------------------------ */

function toAnalyticsError(accountId: string, accountName: string, err: unknown): AnalyticsError {
  if (err instanceof PrismError) {
    return {
      accountId,
      accountName,
      error: err.message,
      code: err.code,
      recoveryAction: err.recoveryAction,
    };
  }
  return {
    accountId,
    accountName,
    error: err instanceof Error ? err.message : "Unknown error",
    code: "API_ERROR",
    recoveryAction: "abort_with_message",
  };
}

/* ------------------------------------------------------------------ */
/*  Get clients that have accounts on a specific platform              */
/* ------------------------------------------------------------------ */

export async function getClientsForPlatform(
  orgId: string,
  platform: AdPlatform,
): Promise<Array<{ id: string; name: string }>> {
  const clients = await db.client.findMany({
    where: {
      orgId,
      adAccounts: { some: { platform, isActive: true } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return clients;
}
