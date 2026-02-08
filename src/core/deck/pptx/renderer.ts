/**
 * PPTX Renderer — PptxGenJS Implementation
 *
 * Implements the DeckRenderer interface using PptxGenJS.
 * Generates native .pptx files server-side.
 */

import PptxGenJS from "pptxgenjs";
import type {
  DeckRenderer,
  DeckOutput,
  DesignTokens,
  SlideData,
  TitleSlideData,
  KPIOverviewData,
  CampaignBreakdownData,
  TrendAnalysisData,
  TopPerformersData,
  AudienceInsightsData,
  BudgetAllocationData,
  ComparisonData,
  ExecutiveSummaryData,
} from "../types";

export class PptxRenderer implements DeckRenderer {
  private pptx: PptxGenJS;
  private tokens!: DesignTokens;

  constructor() {
    this.pptx = new PptxGenJS();
    this.pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"
  }

  async initialize(tokens: DesignTokens): Promise<void> {
    this.tokens = tokens;

    this.pptx.defineSlideMaster({
      title: "PRISM_MASTER",
      background: { color: tokens.colors.background.replace("#", "") },
    });
  }

  async addSlide(data: SlideData): Promise<void> {
    switch (data.type) {
      case "title":
        this.addTitleSlide(data);
        break;
      case "kpi_overview":
        this.addKPIOverviewSlide(data);
        break;
      case "campaign_breakdown":
        this.addCampaignBreakdownSlide(data);
        break;
      case "trend_analysis":
        this.addTrendAnalysisSlide(data);
        break;
      case "top_performers":
        this.addTopPerformersSlide(data);
        break;
      case "audience_insights":
        this.addAudienceInsightsSlide(data);
        break;
      case "budget_allocation":
        this.addBudgetAllocationSlide(data);
        break;
      case "comparison":
        this.addComparisonSlide(data);
        break;
      case "executive_summary":
        this.addExecutiveSummarySlide(data);
        break;
    }
  }

  async finalize(): Promise<DeckOutput> {
    const buffer = (await this.pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return {
      kind: "file",
      buffer,
      filename: "deck.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
  }

  // ─── Slide Builders ──────────────────────────────────────────────────────

  private addTitleSlide(data: TitleSlideData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });

    slide.addText(data.clientName, {
      x: 0.8,
      y: 1.5,
      w: 11.7,
      h: 0.6,
      fontSize: 16,
      fontFace: this.tokens.fonts.body,
      color: this.c(this.tokens.colors.textSecondary),
      bold: false,
    });

    slide.addText(data.reportTitle, {
      x: 0.8,
      y: 2.1,
      w: 11.7,
      h: 1.2,
      fontSize: 36,
      fontFace: this.tokens.fonts.heading,
      color: this.c(this.tokens.colors.primary),
      bold: true,
    });

    slide.addText(data.dateRange, {
      x: 0.8,
      y: 3.5,
      w: 11.7,
      h: 0.5,
      fontSize: 14,
      fontFace: this.tokens.fonts.body,
      color: this.c(this.tokens.colors.textSecondary),
    });

    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.8,
        y: 4.2,
        w: 11.7,
        h: 0.5,
        fontSize: 12,
        fontFace: this.tokens.fonts.body,
        color: this.c(this.tokens.colors.textSecondary),
      });
    }

    // Bottom accent line
    slide.addShape("rect", {
      x: 0.8,
      y: 6.8,
      w: 11.7,
      h: 0.04,
      fill: { color: this.c(this.tokens.colors.accent) },
    });
  }

  private addKPIOverviewSlide(data: KPIOverviewData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    const cols = Math.min(data.metrics.length, 4);
    const rows = Math.ceil(data.metrics.length / cols);
    const cardW = 11.7 / cols - 0.2;
    const cardH = rows > 1 ? 2.0 : 2.8;

    data.metrics.forEach((metric, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.8 + col * (cardW + 0.2);
      const y = 1.6 + row * (cardH + 0.2);

      // Card background
      slide.addShape("roundRect", {
        x,
        y,
        w: cardW,
        h: cardH,
        fill: { color: this.c(this.tokens.colors.surface) },
        rectRadius: 0.1,
      });

      // Metric label
      slide.addText(metric.label, {
        x: x + 0.2,
        y: y + 0.2,
        w: cardW - 0.4,
        h: 0.4,
        fontSize: 11,
        fontFace: this.tokens.fonts.body,
        color: this.c(this.tokens.colors.textSecondary),
      });

      // Metric value
      slide.addText(metric.value, {
        x: x + 0.2,
        y: y + 0.6,
        w: cardW - 0.4,
        h: 0.6,
        fontSize: 28,
        fontFace: this.tokens.fonts.heading,
        color: this.c(this.tokens.colors.text),
        bold: true,
      });

      // Change indicator
      if (metric.change !== undefined) {
        const isPositive = metric.change >= 0;
        const arrow = isPositive ? "\u25B2" : "\u25BC";
        const color = isPositive
          ? this.c(this.tokens.colors.positive)
          : this.c(this.tokens.colors.negative);

        slide.addText(`${arrow} ${Math.abs(metric.change).toFixed(1)}%`, {
          x: x + 0.2,
          y: y + cardH - 0.6,
          w: cardW - 0.4,
          h: 0.4,
          fontSize: 12,
          fontFace: this.tokens.fonts.body,
          color,
        });
      }
    });

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addCampaignBreakdownSlide(data: CampaignBreakdownData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    if (data.chartType === "bar" || data.chartType === "bar_and_table") {
      const chartData = [{
        name: data.highlightMetric,
        labels: data.campaigns.map((c) => c.name),
        values: data.campaigns.map((c) => {
          const val = c.metrics[data.highlightMetric];
          return typeof val === "number" ? val : parseFloat(String(val)) || 0;
        }),
      }];

      slide.addChart("bar", chartData, {
        x: 0.8,
        y: 1.6,
        w: data.chartType === "bar_and_table" ? 6.5 : 11.7,
        h: 4.5,
        showValue: true,
        catAxisLabelFontSize: 9,
        valAxisLabelFontSize: 9,
        chartColors: this.tokens.chart.palette.map((c) => c.replace("#", "")),
      });
    }

    if (data.chartType === "table" || data.chartType === "bar_and_table") {
      const tableX = data.chartType === "bar_and_table" ? 7.8 : 0.8;
      const tableW = data.chartType === "bar_and_table" ? 4.7 : 11.7;
      const metricKeys = Object.keys(data.campaigns[0]?.metrics ?? {});

      const headerRow = [
        { text: "Campaign", options: { bold: true, fontSize: 9, fill: { color: this.c(this.tokens.colors.primary) }, color: "FFFFFF", fontFace: this.tokens.fonts.body } },
        ...metricKeys.map((k) => ({
          text: k.toUpperCase(),
          options: { bold: true, fontSize: 9, fill: { color: this.c(this.tokens.colors.primary) }, color: "FFFFFF", fontFace: this.tokens.fonts.body },
        })),
      ];

      const dataRows = data.campaigns.slice(0, 10).map((campaign, idx) => [
        { text: campaign.name, options: { fontSize: 8, fill: { color: idx % 2 === 0 ? "FFFFFF" : this.c(this.tokens.colors.surface) }, fontFace: this.tokens.fonts.body } },
        ...metricKeys.map((k) => ({
          text: String(campaign.metrics[k] ?? "—"),
          options: { fontSize: 8, fill: { color: idx % 2 === 0 ? "FFFFFF" : this.c(this.tokens.colors.surface) }, fontFace: this.tokens.fonts.body, align: "right" as const },
        })),
      ]);

      slide.addTable([headerRow, ...dataRows], {
        x: tableX,
        y: 1.6,
        w: tableW,
        fontSize: 8,
        border: { type: "solid", pt: 0.5, color: this.c(this.tokens.colors.surface) },
      });
    }

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addTrendAnalysisSlide(data: TrendAnalysisData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    const chartData = data.metrics.map((metric, idx) => ({
      name: metric,
      labels: data.timeSeries.map((ts) => ts.date),
      values: data.timeSeries.map((ts) => ts.metrics[metric] ?? 0),
      color: this.tokens.chart.palette[idx % this.tokens.chart.palette.length]?.replace("#", ""),
    }));

    const chartType = data.chartType === "area" ? "area" : "line";

    slide.addChart(chartType, chartData, {
      x: 0.8,
      y: 1.6,
      w: 11.7,
      h: 4.8,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 9,
      catAxisLabelFontSize: 8,
      valAxisLabelFontSize: 8,
      lineDataSymbol: "none",
      lineSmooth: true,
    });

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addTopPerformersSlide(data: TopPerformersData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    data.items.slice(0, 5).forEach((item, idx) => {
      const y = 1.6 + idx * 1.05;

      // Rank badge
      slide.addShape("ellipse", {
        x: 0.8,
        y: y + 0.1,
        w: 0.5,
        h: 0.5,
        fill: { color: this.c(this.tokens.colors.accent) },
      });
      slide.addText(String(item.rank), {
        x: 0.8,
        y: y + 0.1,
        w: 0.5,
        h: 0.5,
        fontSize: 14,
        fontFace: this.tokens.fonts.heading,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
        bold: true,
      });

      // Name
      slide.addText(item.name, {
        x: 1.5,
        y,
        w: 5,
        h: 0.35,
        fontSize: 13,
        fontFace: this.tokens.fonts.body,
        color: this.c(this.tokens.colors.text),
        bold: true,
      });

      // Primary metric
      slide.addText(`${item.primaryMetric.label}: ${item.primaryMetric.value}`, {
        x: 1.5,
        y: y + 0.35,
        w: 3,
        h: 0.3,
        fontSize: 10,
        fontFace: this.tokens.fonts.body,
        color: this.c(this.tokens.colors.accent),
      });

      // Secondary metrics
      const secondaryText = item.secondaryMetrics
        .map((m) => `${m.label}: ${m.value}`)
        .join("  |  ");
      slide.addText(secondaryText, {
        x: 1.5,
        y: y + 0.65,
        w: 10,
        h: 0.3,
        fontSize: 9,
        fontFace: this.tokens.fonts.body,
        color: this.c(this.tokens.colors.textSecondary),
      });

      // Divider
      if (idx < data.items.length - 1 && idx < 4) {
        slide.addShape("rect", {
          x: 0.8,
          y: y + 0.98,
          w: 11.7,
          h: 0.01,
          fill: { color: this.c(this.tokens.colors.surface) },
        });
      }
    });

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addAudienceInsightsSlide(data: AudienceInsightsData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    const chartsPerRow = Math.min(data.breakdowns.length, 3);
    const chartW = 11.7 / chartsPerRow - 0.3;

    data.breakdowns.forEach((breakdown, idx) => {
      const x = 0.8 + idx * (chartW + 0.3);
      const chartType = data.chartType === "pie" ? "pie" : data.chartType === "doughnut" ? "doughnut" : "bar";

      const chartData = [{
        name: breakdown.dimension,
        labels: breakdown.segments.map((s) => s.label),
        values: breakdown.segments.map((s) => s.metrics.spend),
      }];

      slide.addChart(chartType, chartData, {
        x,
        y: 1.6,
        w: chartW,
        h: 4.5,
        showTitle: true,
        title: breakdown.dimension.charAt(0).toUpperCase() + breakdown.dimension.slice(1),
        titleFontSize: 11,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 8,
        chartColors: this.tokens.chart.palette.map((c) => c.replace("#", "")),
      });
    });

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addBudgetAllocationSlide(data: BudgetAllocationData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    const chartType = data.chartType === "pie" ? "pie" : data.chartType === "doughnut" ? "doughnut" : "bar";

    const chartData = [{
      name: "Budget",
      labels: data.allocations.map((a) => `${a.name} (${a.percentage.toFixed(1)}%)`),
      values: data.allocations.map((a) => a.spend),
    }];

    slide.addChart(chartType, chartData, {
      x: 0.8,
      y: 1.6,
      w: 7,
      h: 5,
      showLegend: true,
      legendPos: "r",
      legendFontSize: 10,
      showValue: chartType === "bar",
      chartColors: this.tokens.chart.palette.map((c) => c.replace("#", "")),
    });

    // Summary stats on the right for pie/doughnut
    if (chartType !== "bar") {
      const totalSpend = data.allocations.reduce((sum, a) => sum + a.spend, 0);
      slide.addText(`Total: $${totalSpend.toLocaleString()}`, {
        x: 8.5,
        y: 1.6,
        w: 4,
        h: 0.5,
        fontSize: 16,
        fontFace: this.tokens.fonts.heading,
        color: this.c(this.tokens.colors.text),
        bold: true,
      });
    }

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addComparisonSlide(data: ComparisonData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    const chartData = [
      {
        name: data.currentPeriod.label,
        labels: data.metricsToCompare.map((m) => m.toUpperCase()),
        values: data.metricsToCompare.map((m) => data.currentPeriod.metrics[m] ?? 0),
      },
      {
        name: data.previousPeriod.label,
        labels: data.metricsToCompare.map((m) => m.toUpperCase()),
        values: data.metricsToCompare.map((m) => data.previousPeriod.metrics[m] ?? 0),
      },
    ];

    slide.addChart("bar", chartData, {
      x: 0.8,
      y: 1.6,
      w: 11.7,
      h: 4.5,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 10,
      showValue: true,
      barGrouping: "clustered",
      chartColors: [
        this.tokens.chart.palette[0]?.replace("#", "") ?? "0f3460",
        this.tokens.chart.palette[1]?.replace("#", "") ?? "e94560",
      ],
    });

    if (data.commentary) {
      this.addCommentary(slide, data.commentary);
    }
  }

  private addExecutiveSummarySlide(data: ExecutiveSummaryData): void {
    const slide = this.pptx.addSlide({ masterName: "PRISM_MASTER" });
    this.addSlideHeader(slide, data.title);

    slide.addText(data.summary, {
      x: 0.8,
      y: 1.8,
      w: 11.7,
      h: 4.5,
      fontSize: 14,
      fontFace: this.tokens.fonts.body,
      color: this.c(this.tokens.colors.text),
      lineSpacingMultiple: 1.5,
      valign: "top",
    });
  }

  // ─── Shared Helpers ──────────────────────────────────────────────────────

  private addSlideHeader(slide: PptxGenJS.Slide, title: string): void {
    // Title
    slide.addText(title, {
      x: 0.8,
      y: 0.4,
      w: 11.7,
      h: 0.6,
      fontSize: 22,
      fontFace: this.tokens.fonts.heading,
      color: this.c(this.tokens.colors.primary),
      bold: true,
    });

    // Accent underline
    slide.addShape("rect", {
      x: 0.8,
      y: 1.1,
      w: 2,
      h: 0.04,
      fill: { color: this.c(this.tokens.colors.accent) },
    });
  }

  private addCommentary(slide: PptxGenJS.Slide, text: string): void {
    slide.addShape("roundRect", {
      x: 0.8,
      y: 6.5,
      w: 11.7,
      h: 0.7,
      fill: { color: this.c(this.tokens.colors.surface) },
      rectRadius: 0.05,
    });

    slide.addText(text, {
      x: 1.0,
      y: 6.55,
      w: 11.3,
      h: 0.6,
      fontSize: 10,
      fontFace: this.tokens.fonts.body,
      color: this.c(this.tokens.colors.textSecondary),
      italic: true,
      valign: "middle",
    });
  }

  /** Strip # from hex color for PptxGenJS */
  private c(hex: string): string {
    return hex.replace("#", "");
  }
}
