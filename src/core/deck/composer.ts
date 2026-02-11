/**
 * Deck Composer
 *
 * Transforms account summary data into slide data objects, then
 * feeds them to a DeckRenderer. This is the bridge between raw ad
 * data and the presentation layer.
 */

import type { AccountSummary, MetricKey } from "@/core/ad-platforms/types";
import type {
  DeckRenderer,
  DeckOutput,
  DeckConfig,
  DesignTokens,
  SlideData,
  SlideSelection,
} from "./types";
import type { DeckAnalyzer, AnalysisInput } from "@/core/analysis/types";
import { defaultDesignTokens } from "./design-tokens";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatMetric(key: MetricKey, value: number): string {
  switch (key) {
    case "spend":
    case "revenue":
    case "cpc":
    case "cpm":
    case "cpa":
      return formatCurrency(value);
    case "roas":
      return `${value.toFixed(2)}x`;
    case "ctr":
      return formatPercent(value);
    case "impressions":
    case "clicks":
    case "conversions":
      return formatNumber(value);
    default:
      return String(value);
  }
}

function metricLabel(key: MetricKey): string {
  const labels: Record<MetricKey, string> = {
    spend: "Spend",
    impressions: "Impressions",
    clicks: "Clicks",
    conversions: "Conversions",
    revenue: "Revenue",
    roas: "ROAS",
    ctr: "CTR",
    cpc: "CPC",
    cpm: "CPM",
    cpa: "CPA",
  };
  return labels[key] ?? key;
}

function percentChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : undefined;
  return ((current - previous) / previous) * 100;
}

export interface ComposeOptions {
  config: DeckConfig;
  accounts: AccountSummary[];
  renderer: DeckRenderer;
  analyzer: DeckAnalyzer;
  onProgress?: (message: string) => void;
}

export async function composeDeck(options: ComposeOptions): Promise<DeckOutput> {
  const { config, accounts, renderer, analyzer, onProgress } = options;

  const tokens: DesignTokens = {
    ...defaultDesignTokens,
    ...config.designTokens,
    colors: { ...defaultDesignTokens.colors, ...config.designTokens?.colors },
    fonts: { ...defaultDesignTokens.fonts, ...config.designTokens?.fonts },
    chart: { ...defaultDesignTokens.chart, ...config.designTokens?.chart },
  };

  onProgress?.("Initializing deck renderer...");
  await renderer.initialize(tokens);

  const analysisInput: AnalysisInput = { accounts };

  // Title slide (always first)
  const dateRange = accounts[0]?.metrics.dateRange;
  const dateLabel = dateRange
    ? `${dateRange.start.toLocaleDateString()} — ${dateRange.end.toLocaleDateString()}`
    : "";

  await renderer.addSlide({
    type: "title",
    clientName: config.clientName,
    reportTitle: config.reportTitle,
    dateRange: dateLabel,
  });

  // Executive summary (if analyzer provides one)
  onProgress?.("Generating analysis...");
  const summary = await analyzer.generateExecutiveSummary(analysisInput);
  if (summary) {
    await renderer.addSlide({
      type: "executive_summary",
      title: "Executive Summary",
      summary,
    });
  }

  // Build slides per account (4 per channel default)
  const enabledSlides = config.slides
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  for (const account of accounts) {
    onProgress?.(`Building slides for ${account.account.name}...`);

    for (const selection of enabledSlides) {
      const slideData = await buildSlideData(selection, account);
      if (!slideData) continue;

      // Add commentary from analyzer if available
      const commentary = await analyzer.generateSlideCommentary(slideData, analysisInput);
      if (commentary && "commentary" in slideData) {
        (slideData as SlideData & { commentary?: string }).commentary = commentary;
      }

      await renderer.addSlide(slideData);
    }
  }

  onProgress?.("Finalizing deck...");
  return renderer.finalize();
}

async function buildSlideData(
  selection: SlideSelection,
  account: AccountSummary
): Promise<SlideData | null> {
  const platform = account.account.platform === "meta" ? "Meta Ads" : "Google Ads";

  switch (selection.type) {
    case "kpi_overview": {
      const kpiMetrics: MetricKey[] = ["spend", "impressions", "clicks", "conversions", "roas", "ctr", "cpc", "cpa"];
      return {
        type: "kpi_overview",
        title: `${platform} — KPI Overview`,
        metrics: kpiMetrics.map((key) => {
          const current = account.metrics[key] ?? 0;
          const previous = account.previousPeriodMetrics?.[key];
          const change = previous !== undefined ? percentChange(current, previous) : undefined;
          return {
            label: metricLabel(key),
            value: formatMetric(key, current),
            change,
            trend: change !== undefined ? (change > 0 ? "up" : change < 0 ? "down" : "flat") : undefined,
          };
        }),
      };
    }

    case "campaign_breakdown": {
      return {
        type: "campaign_breakdown",
        title: `${platform} — Campaign Breakdown`,
        campaigns: account.campaigns
          .sort((a, b) => b.metrics.spend - a.metrics.spend)
          .slice(0, 10)
          .map((c) => ({
            name: c.name,
            metrics: {
              spend: formatCurrency(c.metrics.spend),
              impressions: formatNumber(c.metrics.impressions),
              clicks: formatNumber(c.metrics.clicks),
              ctr: formatPercent(c.metrics.ctr),
              conversions: formatNumber(c.metrics.conversions),
              roas: `${c.metrics.roas.toFixed(2)}x`,
            },
          })),
        highlightMetric: "spend",
        chartType: "bar_and_table",
      };
    }

    case "trend_analysis": {
      if (account.timeSeries.length === 0) return null;
      return {
        type: "trend_analysis",
        title: `${platform} — Performance Trends`,
        timeSeries: account.timeSeries,
        metrics: ["spend", "conversions"],
        chartType: "line",
      };
    }

    case "top_performers": {
      const sorted = [...account.campaigns].sort(
        (a, b) => b.metrics.conversions - a.metrics.conversions
      );
      return {
        type: "top_performers",
        title: `${platform} — Top Performers`,
        items: sorted.slice(0, 5).map((c, i) => ({
          rank: i + 1,
          name: c.name,
          primaryMetric: {
            label: "Conversions",
            value: formatNumber(c.metrics.conversions),
          },
          secondaryMetrics: [
            { label: "Spend", value: formatCurrency(c.metrics.spend) },
            { label: "CPA", value: formatCurrency(c.metrics.cpa) },
            { label: "ROAS", value: `${c.metrics.roas.toFixed(2)}x` },
          ],
        })),
      };
    }

    case "audience_insights": {
      if (account.breakdowns.length === 0) return null;
      return {
        type: "audience_insights",
        title: `${platform} — Audience Insights`,
        breakdowns: account.breakdowns,
        chartType: "doughnut",
      };
    }

    case "budget_allocation": {
      const totalSpend = account.campaigns.reduce((s, c) => s + c.metrics.spend, 0);
      return {
        type: "budget_allocation",
        title: `${platform} — Budget Allocation`,
        allocations: account.campaigns
          .sort((a, b) => b.metrics.spend - a.metrics.spend)
          .slice(0, 10)
          .map((c) => ({
            name: c.name,
            spend: c.metrics.spend,
            percentage: totalSpend > 0 ? (c.metrics.spend / totalSpend) * 100 : 0,
          })),
        chartType: "doughnut",
      };
    }

    case "comparison": {
      if (!account.previousPeriodMetrics) return null;
      const dateRange = account.metrics.dateRange;
      const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
      const prevEnd = new Date(dateRange.start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - periodLength);

      return {
        type: "comparison",
        title: `${platform} — Period Comparison`,
        currentPeriod: {
          label: `${dateRange.start.toLocaleDateString()} — ${dateRange.end.toLocaleDateString()}`,
          metrics: account.metrics,
        },
        previousPeriod: {
          label: `${prevStart.toLocaleDateString()} — ${prevEnd.toLocaleDateString()}`,
          metrics: account.previousPeriodMetrics,
        },
        metricsToCompare: ["spend", "conversions", "roas", "cpa"],
      };
    }

    default:
      return null;
  }
}
