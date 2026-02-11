/**
 * Meta Ads Platform Connector
 *
 * Implements AdPlatformConnector for the Meta Marketing API.
 * Handles OAuth, token refresh, and data fetching/normalization.
 */

import type {
  AdPlatformConnector,
  AdAccount,
  TokenSet,
  OAuthCallbackParams,
  FetchParams,
  MetricsParams,
  NormalizedCampaign,
  NormalizedCreative,
  NormalizedMetrics,
  NormalizedTimeSeries,
  NormalizedBreakdown,
  AccountSummary,
  DateRange,
} from "../types";
import {
  TokenExpiredError,
  RateLimitError,
  ApiError,
  NetworkError,
  AccountAccessError,
} from "@/core/errors/types";

// ─── Meta API Types ──────────────────────────────────────────────────────────

interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  campaign_status?: string;
  objective?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
}

interface MetaAdAccountInfo {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

interface MetaAdRow {
  id: string;
  name: string;
  status: string;
  campaign?: { id: string; name: string };
  adset?: { id: string; name: string };
  creative?: {
    id: string;
    name?: string;
    thumbnail_url?: string;
    object_story_spec?: {
      video_data?: { video_id?: string };
    };
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

function getMetaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new ApiError("Meta", "META_APP_ID and META_APP_SECRET must be set");
  }
  return { appId, appSecret };
}

// ─── Helper: Safe Fetch with Error Mapping ───────────────────────────────────

async function metaFetch<T>(url: string, token: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}access_token=${token}`;

  let response: Response;
  try {
    response = await fetch(fullUrl);
  } catch (err) {
    throw new NetworkError("Meta", err);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = body?.error;

    if (response.status === 401 || error?.code === 190) {
      throw new TokenExpiredError("Meta", error);
    }
    if (response.status === 429 || error?.code === 17 || error?.code === 4) {
      const retryAfter = parseInt(response.headers.get("retry-after") ?? "60", 10);
      throw new RateLimitError("Meta", retryAfter * 1000, error);
    }
    if (response.status === 403 || error?.code === 10 || error?.code === 200) {
      throw new AccountAccessError("Meta", error);
    }

    throw new ApiError(
      "Meta",
      error?.message ?? `HTTP ${response.status}`,
      response.status,
      error
    );
  }

  return response.json() as Promise<T>;
}

// ─── Normalization Helpers ───────────────────────────────────────────────────

function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  const conversionTypes = [
    "offsite_conversion.fb_pixel_purchase",
    "purchase",
    "omni_purchase",
    "complete_registration",
    "lead",
    "offsite_conversion.fb_pixel_lead",
  ];
  const match = actions.find((a) => conversionTypes.includes(a.action_type));
  return match ? parseFloat(match.value) : 0;
}

function extractRevenue(actionValues?: Array<{ action_type: string; value: string }>): number {
  if (!actionValues) return 0;
  const revenueTypes = [
    "offsite_conversion.fb_pixel_purchase",
    "purchase",
    "omni_purchase",
  ];
  const match = actionValues.find((a) => revenueTypes.includes(a.action_type));
  return match ? parseFloat(match.value) : 0;
}

function normalizeMetrics(row: MetaInsightRow, dateRange: DateRange): NormalizedMetrics {
  const spend = parseFloat(row.spend ?? "0");
  const impressions = parseInt(row.impressions ?? "0", 10);
  const clicks = parseInt(row.clicks ?? "0", 10);
  const conversions = extractConversions(row.actions);
  const revenue = extractRevenue(row.action_values);

  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    dateRange,
  };
}

function mapCampaignStatus(status?: string): NormalizedCampaign["status"] {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "paused";
    case "ARCHIVED":
      return "archived";
    default:
      return "completed";
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Connector Implementation ────────────────────────────────────────────────

export class MetaAdsConnector implements AdPlatformConnector {
  platform = "meta" as const;

  getAuthUrl(redirectUri: string, state?: string): string {
    const { appId } = getMetaConfig();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "ads_read",
      response_type: "code",
      ...(state ? { state } : {}),
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  }

  async authorize(params: OAuthCallbackParams): Promise<TokenSet> {
    const { appId, appSecret } = getMetaConfig();

    // Exchange code for short-lived token
    const tokenUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", params.redirectUri);
    tokenUrl.searchParams.set("code", params.code);

    const shortLived = await metaFetch<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(tokenUrl.toString(), "");

    // Exchange for long-lived token (~60 days)
    const longLivedUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

    const longLived = await metaFetch<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(longLivedUrl.toString(), "");

    return {
      accessToken: longLived.access_token,
      expiresAt: new Date(Date.now() + longLived.expires_in * 1000),
      scopes: ["ads_read"],
      platform: "meta",
    };
  }

  async refreshToken(tokenSet: TokenSet): Promise<TokenSet> {
    // Meta long-lived tokens are refreshed by exchanging again
    const { appId, appSecret } = getMetaConfig();

    const url = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", tokenSet.accessToken);

    const result = await metaFetch<{
      access_token: string;
      expires_in: number;
    }>(url.toString(), "");

    return {
      ...tokenSet,
      accessToken: result.access_token,
      expiresAt: new Date(Date.now() + result.expires_in * 1000),
    };
  }

  async listAccounts(tokenSet: TokenSet): Promise<AdAccount[]> {
    interface MetaAccountsResponse {
      data: MetaAdAccountInfo[];
      paging?: { cursors?: { after?: string }; next?: string };
    }

    const allAccounts: AdAccount[] = [];
    let nextUrl: string | null =
      `${META_GRAPH_URL}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&limit=200`;

    while (nextUrl) {
      const result: MetaAccountsResponse = await metaFetch<MetaAccountsResponse>(
        nextUrl,
        tokenSet.accessToken
      );

      for (const acc of result.data) {
        allAccounts.push({
          id: acc.id.replace("act_", ""),
          name: acc.name,
          platform: "meta" as const,
          currency: acc.currency,
          timezone: acc.timezone_name,
          status: acc.account_status === 1 ? "active" : "disabled",
        });
      }

      // Follow cursor-based pagination
      nextUrl = result.paging?.next ?? null;
    }

    return allAccounts;
  }

  async fetchCampaigns(params: FetchParams): Promise<NormalizedCampaign[]> {
    const { accountId, tokenSet, dateRange } = params;
    const fields = [
      "campaign_id",
      "campaign_name",
      "objective",
      "spend",
      "impressions",
      "clicks",
      "cpc",
      "cpm",
      "ctr",
      "actions",
      "action_values",
    ].join(",");

    const timeRange = JSON.stringify({
      since: formatDate(dateRange.start),
      until: formatDate(dateRange.end),
    });

    const result = await metaFetch<{ data: MetaInsightRow[] }>(
      `${META_GRAPH_URL}/act_${accountId}/insights?fields=${fields}&level=campaign&time_range=${encodeURIComponent(timeRange)}&limit=500`,
      tokenSet.accessToken
    );

    return result.data.map((row) => ({
      id: row.campaign_id ?? "",
      name: row.campaign_name ?? "Unknown Campaign",
      status: "active" as const,
      platform: "meta" as const,
      objective: row.objective,
      metrics: normalizeMetrics(row, dateRange),
    }));
  }

  async fetchAccountSummary(params: MetricsParams): Promise<AccountSummary> {
    const { accountId, tokenSet, dateRange } = params;

    // Fetch account info, campaigns, time series, and breakdowns in parallel
    const [accountInfo, campaigns, timeSeries, breakdowns] = await Promise.all([
      this.fetchAccountInfo(accountId, tokenSet),
      this.fetchCampaigns({ accountId, tokenSet, dateRange }),
      this.fetchTimeSeries(accountId, tokenSet, dateRange),
      this.fetchBreakdowns(accountId, tokenSet, dateRange),
    ]);

    // Aggregate campaign metrics into account-level metrics
    const metrics = this.aggregateMetrics(campaigns, dateRange);

    // Try to fetch previous period for comparison
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousDateRange: DateRange = {
      start: new Date(dateRange.start.getTime() - periodLength),
      end: new Date(dateRange.start.getTime() - 1),
    };

    let previousPeriodMetrics: NormalizedMetrics | undefined;
    try {
      const previousCampaigns = await this.fetchCampaigns({
        accountId,
        tokenSet,
        dateRange: previousDateRange,
      });
      previousPeriodMetrics = this.aggregateMetrics(previousCampaigns, previousDateRange);
    } catch {
      // Previous period data not available — that's fine
    }

    return {
      account: accountInfo,
      metrics,
      previousPeriodMetrics,
      campaigns,
      timeSeries,
      breakdowns,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async fetchAccountInfo(accountId: string, tokenSet: TokenSet): Promise<AdAccount> {
    const result = await metaFetch<MetaAdAccountInfo>(
      `${META_GRAPH_URL}/act_${accountId}?fields=id,name,currency,timezone_name,account_status`,
      tokenSet.accessToken
    );

    return {
      id: accountId,
      name: result.name,
      platform: "meta",
      currency: result.currency,
      timezone: result.timezone_name,
      status: result.account_status === 1 ? "active" : "disabled",
    };
  }

  private async fetchTimeSeries(
    accountId: string,
    tokenSet: TokenSet,
    dateRange: DateRange
  ): Promise<NormalizedTimeSeries[]> {
    const fields = "spend,impressions,clicks,actions,action_values";
    const timeRange = JSON.stringify({
      since: formatDate(dateRange.start),
      until: formatDate(dateRange.end),
    });

    const result = await metaFetch<{ data: MetaInsightRow[] }>(
      `${META_GRAPH_URL}/act_${accountId}/insights?fields=${fields}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=500`,
      tokenSet.accessToken
    );

    return result.data.map((row) => ({
      date: row.date_start ?? "",
      metrics: normalizeMetrics(row, {
        start: new Date(row.date_start ?? dateRange.start),
        end: new Date(row.date_stop ?? dateRange.end),
      }),
    }));
  }

  private async fetchBreakdowns(
    accountId: string,
    tokenSet: TokenSet,
    dateRange: DateRange
  ): Promise<NormalizedBreakdown[]> {
    const fields = "spend,impressions,clicks,actions,action_values";
    const timeRange = JSON.stringify({
      since: formatDate(dateRange.start),
      until: formatDate(dateRange.end),
    });

    // Fetch age+gender and device breakdowns in parallel
    const [ageGender, device] = await Promise.all([
      metaFetch<{ data: Array<MetaInsightRow & { age?: string; gender?: string }> }>(
        `${META_GRAPH_URL}/act_${accountId}/insights?fields=${fields}&breakdowns=age,gender&time_range=${encodeURIComponent(timeRange)}&limit=500`,
        tokenSet.accessToken
      ),
      metaFetch<{ data: Array<MetaInsightRow & { device_platform?: string }> }>(
        `${META_GRAPH_URL}/act_${accountId}/insights?fields=${fields}&breakdowns=device_platform&time_range=${encodeURIComponent(timeRange)}&limit=500`,
        tokenSet.accessToken
      ),
    ]);

    const breakdowns: NormalizedBreakdown[] = [];

    // Process age breakdown (aggregate across genders)
    const ageMap = new Map<string, MetaInsightRow[]>();
    for (const row of ageGender.data) {
      const age = row.age ?? "Unknown";
      if (!ageMap.has(age)) ageMap.set(age, []);
      ageMap.get(age)!.push(row);
    }
    breakdowns.push({
      dimension: "age",
      segments: Array.from(ageMap.entries()).map(([label, rows]) => ({
        label,
        metrics: this.aggregateInsightRows(rows, dateRange),
      })),
    });

    // Process gender breakdown (aggregate across ages)
    const genderMap = new Map<string, MetaInsightRow[]>();
    for (const row of ageGender.data) {
      const gender = row.gender ?? "Unknown";
      if (!genderMap.has(gender)) genderMap.set(gender, []);
      genderMap.get(gender)!.push(row);
    }
    breakdowns.push({
      dimension: "gender",
      segments: Array.from(genderMap.entries()).map(([label, rows]) => ({
        label,
        metrics: this.aggregateInsightRows(rows, dateRange),
      })),
    });

    // Process device breakdown
    breakdowns.push({
      dimension: "device",
      segments: device.data.map((row) => ({
        label: row.device_platform ?? "Unknown",
        metrics: normalizeMetrics(row, dateRange),
      })),
    });

    return breakdowns;
  }

  private async fetchCreatives(
    accountId: string,
    tokenSet: TokenSet,
    dateRange: DateRange
  ): Promise<NormalizedCreative[]> {
    const timeRange = JSON.stringify({
      since: formatDate(dateRange.start),
      until: formatDate(dateRange.end),
    });

    // Fetch ads with their creative thumbnails and campaign/adset names
    const adFields = "id,name,status,campaign{id,name},adset{id,name},creative{id,name,thumbnail_url,object_story_spec}";
    let ads: MetaAdRow[] = [];
    let nextUrl: string | null =
      `${META_GRAPH_URL}/act_${accountId}/ads?fields=${encodeURIComponent(adFields)}&effective_status=["ACTIVE","PAUSED"]&limit=100`;

    while (nextUrl && ads.length < 200) {
      const result = await metaFetch<{ data: MetaAdRow[]; paging?: { next?: string } }>(
        nextUrl,
        tokenSet.accessToken
      );
      ads = ads.concat(result.data);
      nextUrl = result.paging?.next ?? null;
    }

    if (ads.length === 0) return [];

    // Fetch ad-level insights for the date range
    const insightFields = "ad_id,spend,impressions,clicks,ctr,cpc,actions,action_values";
    const insightsResult = await metaFetch<{ data: Array<MetaInsightRow & { ad_id?: string }> }>(
      `${META_GRAPH_URL}/act_${accountId}/insights?fields=${insightFields}&level=ad&time_range=${encodeURIComponent(timeRange)}&limit=500`,
      tokenSet.accessToken
    );

    // Index insights by ad_id
    const insightsById = new Map<string, MetaInsightRow>();
    for (const row of insightsResult.data) {
      if (row.ad_id) insightsById.set(row.ad_id, row);
    }

    // Join ads with their insights and build NormalizedCreative[]
    const creatives: NormalizedCreative[] = [];
    for (const ad of ads) {
      const insight = insightsById.get(ad.id);
      const metrics = insight
        ? normalizeMetrics(insight, dateRange)
        : { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, roas: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0, dateRange };

      // Skip ads with zero spend — not useful for creative review
      if (metrics.spend === 0) continue;

      const hasVideo = !!ad.creative?.object_story_spec?.video_data?.video_id;
      creatives.push({
        id: ad.id,
        name: ad.creative?.name ?? ad.name,
        platform: "meta",
        campaignName: ad.campaign?.name ?? "Unknown Campaign",
        adSetName: ad.adset?.name,
        thumbnailUrl: ad.creative?.thumbnail_url,
        format: hasVideo ? "video" : "image",
        metrics,
      });
    }

    // Sort by spend descending — most significant creatives first
    creatives.sort((a, b) => b.metrics.spend - a.metrics.spend);

    return creatives;
  }

  private aggregateInsightRows(rows: MetaInsightRow[], dateRange: DateRange): NormalizedMetrics {
    let spend = 0, impressions = 0, clicks = 0, conversions = 0, revenue = 0;
    for (const row of rows) {
      spend += parseFloat(row.spend ?? "0");
      impressions += parseInt(row.impressions ?? "0", 10);
      clicks += parseInt(row.clicks ?? "0", 10);
      conversions += extractConversions(row.actions);
      revenue += extractRevenue(row.action_values);
    }
    return {
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      dateRange,
    };
  }

  private aggregateMetrics(campaigns: NormalizedCampaign[], dateRange: DateRange): NormalizedMetrics {
    let spend = 0, impressions = 0, clicks = 0, conversions = 0, revenue = 0;
    for (const campaign of campaigns) {
      spend += campaign.metrics.spend;
      impressions += campaign.metrics.impressions;
      clicks += campaign.metrics.clicks;
      conversions += campaign.metrics.conversions;
      revenue += campaign.metrics.revenue;
    }
    return {
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      dateRange,
    };
  }
}
