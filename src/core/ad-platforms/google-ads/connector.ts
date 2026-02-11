/**
 * Google Ads Platform Connector
 *
 * Implements AdPlatformConnector for the Google Ads API.
 * Uses the google-ads-api (Opteo) library with GAQL queries.
 */

import type {
  AdPlatformConnector,
  AdAccount,
  TokenSet,
  OAuthCallbackParams,
  FetchParams,
  MetricsParams,
  NormalizedCampaign,
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

// ─── Config ──────────────────────────────────────────────────────────────────

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getGoogleAdsConfig() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!clientId || !clientSecret || !developerToken) {
    throw new ApiError(
      "Google Ads",
      "GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN must be set"
    );
  }
  return { clientId, clientSecret, developerToken };
}

// ─── Helper: Safe Fetch with Error Mapping ───────────────────────────────────

async function googleAdsFetch<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new NetworkError("Google Ads", err);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const errorDetail = body?.error;

    if (response.status === 401) {
      throw new TokenExpiredError("Google Ads", errorDetail);
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("retry-after") ?? "60", 10);
      throw new RateLimitError("Google Ads", retryAfter * 1000, errorDetail);
    }
    if (response.status === 403) {
      throw new AccountAccessError("Google Ads", errorDetail);
    }

    throw new ApiError(
      "Google Ads",
      errorDetail?.message ?? `HTTP ${response.status}`,
      response.status,
      errorDetail
    );
  }

  return response.json() as Promise<T>;
}

// ─── GAQL Query Helper (via REST API) ────────────────────────────────────────

interface GaqlRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    biddingStrategyType?: string;
  };
  metrics?: {
    clicks?: string;
    impressions?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
    ctr?: number;
    averageCpc?: string;
    averageCpm?: string;
  };
  segments?: {
    date?: string;
    device?: string;
  };
  customerClient?: {
    id?: string;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
    status?: string;
    manager?: boolean;
  };
}

async function executeGaql(
  customerId: string,
  query: string,
  accessToken: string,
  developerToken: string,
  loginCustomerId?: string
): Promise<GaqlRow[]> {
  const url = `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  // Required when accessing sub-accounts through an MCC/manager account
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const result = await googleAdsFetch<Array<{ results: GaqlRow[] }>>(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  return result.flatMap((batch) => batch.results ?? []);
}

// ─── Normalization Helpers ───────────────────────────────────────────────────

function micros(value?: string): number {
  return value ? parseInt(value, 10) / 1_000_000 : 0;
}

function normalizeGoogleMetrics(row: GaqlRow, dateRange: DateRange): NormalizedMetrics {
  const spend = micros(row.metrics?.costMicros);
  const impressions = parseInt(String(row.metrics?.impressions ?? "0"), 10);
  const clicks = parseInt(String(row.metrics?.clicks ?? "0"), 10);
  const conversions = row.metrics?.conversions ?? 0;
  const revenue = row.metrics?.conversionsValue ?? 0;

  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    ctr: (row.metrics?.ctr ?? 0) * 100,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    dateRange,
  };
}

function mapGoogleCampaignStatus(status?: string): NormalizedCampaign["status"] {
  switch (status) {
    case "ENABLED":
      return "active";
    case "PAUSED":
      return "paused";
    case "REMOVED":
      return "archived";
    default:
      return "completed";
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Connector Implementation ────────────────────────────────────────────────

export class GoogleAdsConnector implements AdPlatformConnector {
  platform = "google" as const;

  getAuthUrl(redirectUri: string, state?: string): string {
    const { clientId } = getGoogleAdsConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline",
      prompt: "consent",
      ...(state ? { state } : {}),
    });
    return `${GOOGLE_OAUTH_URL}?${params}`;
  }

  async authorize(params: OAuthCallbackParams): Promise<TokenSet> {
    const { clientId, clientSecret } = getGoogleAdsConfig();

    const response = await googleAdsFetch<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    }>(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: params.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
      scopes: response.scope.split(" "),
      platform: "google",
    };
  }

  async refreshToken(tokenSet: TokenSet): Promise<TokenSet> {
    if (!tokenSet.refreshToken) {
      throw new TokenExpiredError("Google Ads");
    }

    const { clientId, clientSecret } = getGoogleAdsConfig();

    const response = await googleAdsFetch<{
      access_token: string;
      expires_in: number;
    }>(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: tokenSet.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    return {
      ...tokenSet,
      accessToken: response.access_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
    };
  }

  async listAccounts(tokenSet: TokenSet): Promise<AdAccount[]> {
    const { developerToken } = getGoogleAdsConfig();

    // First get the MCC/manager account customer IDs accessible
    const url = "https://googleads.googleapis.com/v20/customers:listAccessibleCustomers";
    const result = await googleAdsFetch<{ resourceNames: string[] }>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenSet.accessToken}`,
        "developer-token": developerToken,
      },
    });

    const accounts: AdAccount[] = [];
    const seenIds = new Set<string>();

    for (const resourceName of result.resourceNames) {
      const customerId = resourceName.replace("customers/", "");
      try {
        // Use login-customer-id = customerId since this is an MCC querying its sub-accounts
        const rows = await executeGaql(
          customerId,
          `SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.status, customer_client.manager FROM customer_client WHERE customer_client.status = 'ENABLED'`,
          tokenSet.accessToken,
          developerToken,
          customerId
        );

        for (const row of rows) {
          if (row.customerClient) {
            const accountId = row.customerClient.id ?? customerId;
            // Skip duplicates (same account accessible from multiple MCCs)
            if (seenIds.has(accountId)) continue;
            seenIds.add(accountId);

            // If the sub-account is different from the MCC, store the MCC as managerCustomerId
            const isSubAccount = accountId !== customerId;
            accounts.push({
              id: accountId,
              name: row.customerClient.descriptiveName ?? `Account ${accountId}`,
              platform: "google",
              currency: row.customerClient.currencyCode ?? "USD",
              timezone: row.customerClient.timeZone ?? "America/New_York",
              status: row.customerClient.status === "ENABLED" ? "active" : "disabled",
              managerCustomerId: isSubAccount ? customerId : undefined,
            });
          }
        }
      } catch {
        // Some accounts may not be queryable (no sub-accounts) — add the MCC itself
        if (!seenIds.has(customerId)) {
          seenIds.add(customerId);
          accounts.push({
            id: customerId,
            name: `Account ${customerId}`,
            platform: "google",
            currency: "USD",
            timezone: "America/New_York",
            status: "active",
          });
        }
      }
    }

    return accounts;
  }

  async fetchCampaigns(params: FetchParams): Promise<NormalizedCampaign[]> {
    const { accountId, tokenSet, dateRange, loginCustomerId } = params;
    const { developerToken } = getGoogleAdsConfig();

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.bidding_strategy_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${formatDate(dateRange.start)}' AND '${formatDate(dateRange.end)}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    const rows = await executeGaql(
      accountId,
      query,
      tokenSet.accessToken,
      developerToken,
      loginCustomerId
    );

    return rows.map((row) => ({
      id: row.campaign?.id ?? "",
      name: row.campaign?.name ?? "Unknown Campaign",
      status: mapGoogleCampaignStatus(row.campaign?.status),
      platform: "google" as const,
      objective: row.campaign?.biddingStrategyType,
      metrics: normalizeGoogleMetrics(row, dateRange),
    }));
  }

  async fetchAccountSummary(params: MetricsParams): Promise<AccountSummary> {
    const { accountId, tokenSet, dateRange, loginCustomerId } = params;
    const { developerToken } = getGoogleAdsConfig();

    // Fetch campaigns, time series, and device breakdown in parallel
    const [campaigns, timeSeries, deviceBreakdown] = await Promise.all([
      this.fetchCampaigns({ accountId, tokenSet, dateRange, loginCustomerId }),
      this.fetchTimeSeries(accountId, tokenSet, dateRange, developerToken, loginCustomerId),
      this.fetchDeviceBreakdown(accountId, tokenSet, dateRange, developerToken, loginCustomerId),
    ]);

    const metrics = this.aggregateMetrics(campaigns, dateRange);

    // Fetch previous period
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousDateRange: DateRange = {
      start: new Date(dateRange.start.getTime() - periodLength),
      end: new Date(dateRange.start.getTime() - 1),
    };

    let previousPeriodMetrics: NormalizedMetrics | undefined;
    try {
      const prevCampaigns = await this.fetchCampaigns({
        accountId,
        tokenSet,
        dateRange: previousDateRange,
        loginCustomerId,
      });
      previousPeriodMetrics = this.aggregateMetrics(prevCampaigns, previousDateRange);
    } catch {
      // Previous period not available
    }

    // Build account info from first available data
    const account: AdAccount = {
      id: accountId,
      name: `Google Ads ${accountId}`,
      platform: "google",
      currency: "USD",
      timezone: "America/New_York",
      status: "active",
    };

    return {
      account,
      metrics,
      previousPeriodMetrics,
      campaigns,
      timeSeries,
      breakdowns: [deviceBreakdown],
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async fetchTimeSeries(
    accountId: string,
    tokenSet: TokenSet,
    dateRange: DateRange,
    developerToken: string,
    loginCustomerId?: string
  ): Promise<NormalizedTimeSeries[]> {
    const query = `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${formatDate(dateRange.start)}' AND '${formatDate(dateRange.end)}'
      ORDER BY segments.date ASC
    `;

    const rows = await executeGaql(accountId, query, tokenSet.accessToken, developerToken, loginCustomerId);

    // Aggregate by date (rows are per-campaign-per-date)
    const dateMap = new Map<string, GaqlRow[]>();
    for (const row of rows) {
      const date = row.segments?.date ?? "";
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date)!.push(row);
    }

    return Array.from(dateMap.entries()).map(([date, dayRows]) => ({
      date,
      metrics: this.aggregateGaqlRows(dayRows, dateRange),
    }));
  }

  private async fetchDeviceBreakdown(
    accountId: string,
    tokenSet: TokenSet,
    dateRange: DateRange,
    developerToken: string,
    loginCustomerId?: string
  ): Promise<NormalizedBreakdown> {
    const query = `
      SELECT
        segments.device,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${formatDate(dateRange.start)}' AND '${formatDate(dateRange.end)}'
    `;

    const rows = await executeGaql(accountId, query, tokenSet.accessToken, developerToken, loginCustomerId);

    const deviceMap = new Map<string, GaqlRow[]>();
    for (const row of rows) {
      const device = row.segments?.device ?? "UNKNOWN";
      if (!deviceMap.has(device)) deviceMap.set(device, []);
      deviceMap.get(device)!.push(row);
    }

    return {
      dimension: "device",
      segments: Array.from(deviceMap.entries()).map(([label, deviceRows]) => ({
        label: label.replace("_", " ").toLowerCase(),
        metrics: this.aggregateGaqlRows(deviceRows, dateRange),
      })),
    };
  }

  private aggregateGaqlRows(rows: GaqlRow[], dateRange: DateRange): NormalizedMetrics {
    let spend = 0, impressions = 0, clicks = 0, conversions = 0, revenue = 0;
    for (const row of rows) {
      spend += micros(row.metrics?.costMicros);
      impressions += parseInt(String(row.metrics?.impressions ?? "0"), 10);
      clicks += parseInt(String(row.metrics?.clicks ?? "0"), 10);
      conversions += row.metrics?.conversions ?? 0;
      revenue += row.metrics?.conversionsValue ?? 0;
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
