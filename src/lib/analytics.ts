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

/* ------------------------------------------------------------------ */
/*  Types for view components                                          */
/* ------------------------------------------------------------------ */

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
      for (const acc of metaAccounts) {
        try {
          const connector = new MetaAdsConnector();
          const summary = await connector.fetchAccountSummary({
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
          });
          totalSpend += summary.metrics.spend;
          totalConv += summary.metrics.conversions;
          totalRev += summary.metrics.revenue;
        } catch (err) {
          console.error(`[Analytics] Meta fetch failed for ${acc.platformId}:`, err);
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
      for (const acc of googleAccounts) {
        try {
          const connector = new GoogleAdsConnector();
          const summary = await connector.fetchAccountSummary({
            accountId: acc.platformId,
            tokenSet: {
              accessToken: acc.platformAuth.accessToken,
              refreshToken: acc.platformAuth.refreshToken ?? undefined,
              scopes: acc.platformAuth.scopes,
              platform: "google",
            },
            dateRange,
            level: "account",
            metrics: ["spend", "conversions", "roas"],
          });
          totalSpend += summary.metrics.spend;
          totalConv += summary.metrics.conversions;
          totalRev += summary.metrics.revenue;
        } catch (err) {
          console.error(`[Analytics] Google fetch failed for ${acc.platformId}:`, err);
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
      for (const acc of shopifyAccounts) {
        try {
          const connector = new ShopifyConnector();
          const shop = (acc.platformAuth.platformMeta as { shop?: string })?.shop ?? acc.platformId;
          const summary = await connector.fetchEcommerceSummary(
            shop,
            {
              accessToken: acc.platformAuth.accessToken,
              refreshToken: acc.platformAuth.refreshToken ?? undefined,
              scopes: acc.platformAuth.scopes,
              platform: "shopify",
            },
            dateRange,
          );
          totalRevenue += summary.metrics.revenue;
          totalOrders += summary.metrics.orders;
        } catch (err) {
          console.error(`[Analytics] Shopify fetch failed for ${acc.platformId}:`, err);
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
): Promise<AccountSummary[]> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "meta", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true } } },
  });

  const summaries: AccountSummary[] = [];
  for (const acc of accounts) {
    try {
      const connector = new MetaAdsConnector();
      const summary = await connector.fetchAccountSummary({
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
      });
      summaries.push(summary);
    } catch (err) {
      console.error(`[Analytics] Meta fetch failed for ${acc.platformId}:`, err);
    }
  }
  return summaries;
}

export async function getGoogleAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<AccountSummary[]> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "google", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true } } },
  });

  const summaries: AccountSummary[] = [];
  for (const acc of accounts) {
    try {
      const connector = new GoogleAdsConnector();
      const summary = await connector.fetchAccountSummary({
        accountId: acc.platformId,
        tokenSet: {
          accessToken: acc.platformAuth.accessToken,
          refreshToken: acc.platformAuth.refreshToken ?? undefined,
          scopes: acc.platformAuth.scopes,
          platform: "google",
        },
        dateRange: range,
        level: "account",
        metrics: ["spend", "impressions", "clicks", "conversions", "revenue", "roas", "ctr", "cpc", "cpm", "cpa"],
      });
      summaries.push(summary);
    } catch (err) {
      console.error(`[Analytics] Google fetch failed for ${acc.platformId}:`, err);
    }
  }
  return summaries;
}

export async function getShopifyAnalytics(
  clientId: string,
  dateRange?: DateRange,
): Promise<EcommerceSummary[]> {
  const range = dateRange ?? defaultDateRange();
  const accounts = await db.adAccount.findMany({
    where: { clientId, platform: "shopify", isActive: true },
    include: { platformAuth: { select: { accessToken: true, refreshToken: true, scopes: true, platformMeta: true } } },
  });

  const summaries: EcommerceSummary[] = [];
  for (const acc of accounts) {
    try {
      const connector = new ShopifyConnector();
      const shop = (acc.platformAuth.platformMeta as { shop?: string })?.shop ?? acc.platformId;
      const summary = await connector.fetchEcommerceSummary(
        shop,
        {
          accessToken: acc.platformAuth.accessToken,
          refreshToken: acc.platformAuth.refreshToken ?? undefined,
          scopes: acc.platformAuth.scopes,
          platform: "shopify",
        },
        range,
      );
      summaries.push(summary);
    } catch (err) {
      console.error(`[Analytics] Shopify fetch failed for ${acc.platformId}:`, err);
    }
  }
  return summaries;
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
