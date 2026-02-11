/**
 * Deck Renderer Interface & Slide Data Types
 *
 * Slide-level abstraction with design tokens. Both PptxRenderer and
 * GoogleSlidesRenderer implement DeckRenderer using the same slide types.
 */

import type { NormalizedMetrics, NormalizedTimeSeries, NormalizedBreakdown, MetricKey } from "@/core/ad-platforms/types";

// ─── Design Tokens ───────────────────────────────────────────────────────────

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    positive: string;  // for positive trends (green)
    negative: string;  // for negative trends (red)
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  chart: {
    palette: string[];
    gridColor: string;
    labelSize: number;
  };
}

// ─── Slide Data Types ────────────────────────────────────────────────────────

export interface TitleSlideData {
  type: "title";
  clientName: string;
  reportTitle: string;
  dateRange: string;
  subtitle?: string;
}

export interface KPIOverviewData {
  type: "kpi_overview";
  title: string;
  metrics: Array<{
    label: string;
    value: string;
    change?: number;     // percentage change from previous period
    trend?: "up" | "down" | "flat";
  }>;
  commentary?: string;
}

export interface CampaignBreakdownData {
  type: "campaign_breakdown";
  title: string;
  campaigns: Array<{
    name: string;
    metrics: Record<string, string | number>;
  }>;
  highlightMetric: MetricKey;
  chartType: "bar" | "table" | "bar_and_table";
  commentary?: string;
}

export interface TrendAnalysisData {
  type: "trend_analysis";
  title: string;
  timeSeries: NormalizedTimeSeries[];
  metrics: MetricKey[];
  chartType: "line" | "area";
  commentary?: string;
}

export interface TopPerformersData {
  type: "top_performers";
  title: string;
  items: Array<{
    rank: number;
    name: string;
    primaryMetric: { label: string; value: string };
    secondaryMetrics: Array<{ label: string; value: string }>;
  }>;
  commentary?: string;
}

export interface AudienceInsightsData {
  type: "audience_insights";
  title: string;
  breakdowns: NormalizedBreakdown[];
  chartType: "bar" | "pie" | "doughnut";
  commentary?: string;
}

export interface BudgetAllocationData {
  type: "budget_allocation";
  title: string;
  allocations: Array<{
    name: string;
    spend: number;
    percentage: number;
  }>;
  chartType: "pie" | "doughnut" | "bar";
  commentary?: string;
}

export interface ComparisonData {
  type: "comparison";
  title: string;
  currentPeriod: { label: string; metrics: NormalizedMetrics };
  previousPeriod: { label: string; metrics: NormalizedMetrics };
  metricsToCompare: MetricKey[];
  commentary?: string;
}

export interface ExecutiveSummaryData {
  type: "executive_summary";
  title: string;
  summary: string;
}

export type SlideData =
  | TitleSlideData
  | KPIOverviewData
  | CampaignBreakdownData
  | TrendAnalysisData
  | TopPerformersData
  | AudienceInsightsData
  | BudgetAllocationData
  | ComparisonData
  | ExecutiveSummaryData;

// ─── Deck Output ─────────────────────────────────────────────────────────────

export interface DeckOutputFile {
  kind: "file";
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface DeckOutputUrl {
  kind: "url";
  url: string;
  title: string;
}

export type DeckOutput = DeckOutputFile | DeckOutputUrl;

// ─── Renderer Interface ─────────────────────────────────────────────────────

export interface DeckRenderer {
  /** Initialize the renderer with design tokens */
  initialize(tokens: DesignTokens): Promise<void>;

  /** Add a slide to the deck */
  addSlide(data: SlideData): Promise<void>;

  /** Finalize and return the generated deck */
  finalize(): Promise<DeckOutput>;
}

// ─── Deck Generation Config ─────────────────────────────────────────────────

export interface DeckConfig {
  clientName: string;
  reportTitle: string;
  outputFormat: "pptx" | "google_slides";
  slides: SlideSelection[];
  designTokens?: Partial<DesignTokens>;
}

export interface SlideSelection {
  type: SlideData["type"];
  enabled: boolean;
  order: number;
  config?: Record<string, unknown>;
}
