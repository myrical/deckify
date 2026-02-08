/**
 * Data Source Connector Interface & Normalized Data Types
 *
 * All platform-specific connectors (Meta, Google Ads, Shopify, etc.)
 * implement DataSourceConnector and return normalized types.
 * Everything downstream is platform-agnostic.
 */

// ─── Platform Enum ───────────────────────────────────────────────────────────

export type AdPlatform = "meta" | "google" | "shopify";

// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  platform: AdPlatform;
}

export interface OAuthCallbackParams {
  code: string;
  state?: string;
  redirectUri: string;
}

// ─── Account Types ───────────────────────────────────────────────────────────

export interface AdAccount {
  id: string;
  name: string;
  platform: AdPlatform;
  currency: string;
  timezone: string;
  status: "active" | "disabled" | "closed";
}

// ─── Fetch Parameters ────────────────────────────────────────────────────────

export interface FetchParams {
  accountId: string;
  tokenSet: TokenSet;
  dateRange: DateRange;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricsParams extends FetchParams {
  level: "account" | "campaign" | "adset" | "ad";
  metrics: MetricKey[];
  breakdowns?: Breakdown[];
}

export type MetricKey =
  | "spend"
  | "impressions"
  | "clicks"
  | "conversions"
  | "revenue"
  | "roas"
  | "ctr"
  | "cpc"
  | "cpm"
  | "cpa";

export type Breakdown =
  | "age"
  | "gender"
  | "device"
  | "placement"
  | "date";

// ─── Normalized Data Models ──────────────────────────────────────────────────

export interface NormalizedCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "archived";
  platform: AdPlatform;
  objective?: string;
  budget?: number;
  metrics: NormalizedMetrics;
}

export interface NormalizedMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  dateRange: DateRange;
}

export interface NormalizedTimeSeries {
  date: string; // ISO date string
  metrics: NormalizedMetrics;
}

export interface NormalizedBreakdown {
  dimension: Breakdown;
  segments: Array<{
    label: string;
    metrics: NormalizedMetrics;
  }>;
}

// ─── E-Commerce Data Models (Shopify/WooCommerce) ────────────────────────────

export interface NormalizedEcommerceMetrics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  refunds: number;
  refundAmount: number;
  newCustomers: number;
  returningCustomers: number;
  conversionRate: number;
  dateRange: DateRange;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  unitsSold: number;
  refundRate: number;
}

export interface NormalizedEcommerceTimeSeries {
  date: string;
  metrics: NormalizedEcommerceMetrics;
}

export interface EcommerceSummary {
  account: AdAccount;
  metrics: NormalizedEcommerceMetrics;
  previousPeriodMetrics?: NormalizedEcommerceMetrics;
  topProducts: NormalizedProduct[];
  timeSeries: NormalizedEcommerceTimeSeries[];
}

// ─── Creative / Ad Preview Types ─────────────────────────────────────────────

export interface NormalizedCreative {
  id: string;
  name: string;
  platform: AdPlatform;
  campaignName: string;
  adSetName?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  format: "image" | "video" | "carousel" | "text";
  metrics: NormalizedMetrics;
}

// ─── Cross-Platform Aggregate Types ──────────────────────────────────────────

export interface CrossPlatformSummary {
  totalAdSpend: number;
  totalRevenue: number;        // from Shopify/WooCommerce
  blendedRoas: number;         // totalRevenue / totalAdSpend
  mer: number;                 // Marketing Efficiency Ratio (same calc, different name)
  totalConversions: number;
  totalOrders: number;
  platformBreakdown: Array<{
    platform: AdPlatform;
    spend: number;
    conversions: number;
    revenue: number;
    roas: number;
  }>;
  dateRange: DateRange;
}

// ─── Account-Level Summary ───────────────────────────────────────────────────

export interface AccountSummary {
  account: AdAccount;
  metrics: NormalizedMetrics;
  previousPeriodMetrics?: NormalizedMetrics;
  campaigns: NormalizedCampaign[];
  timeSeries: NormalizedTimeSeries[];
  breakdowns: NormalizedBreakdown[];
}

// ─── Connector Interface ─────────────────────────────────────────────────────

export interface AdPlatformConnector {
  platform: AdPlatform;

  /** Exchange OAuth authorization code for tokens */
  authorize(params: OAuthCallbackParams): Promise<TokenSet>;

  /** Refresh an expired access token */
  refreshToken(tokenSet: TokenSet): Promise<TokenSet>;

  /** List ad accounts accessible with the given tokens */
  listAccounts(tokenSet: TokenSet): Promise<AdAccount[]>;

  /** Fetch campaigns with their metrics */
  fetchCampaigns(params: FetchParams): Promise<NormalizedCampaign[]>;

  /** Fetch account-level summary with all data needed for deck generation */
  fetchAccountSummary(params: MetricsParams): Promise<AccountSummary>;

  /** Get the OAuth authorization URL to redirect the user to */
  getAuthUrl(redirectUri: string, state?: string): string;
}
