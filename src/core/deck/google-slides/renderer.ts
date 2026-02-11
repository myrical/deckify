/**
 * Google Slides Renderer
 *
 * Implements DeckRenderer using the Google Slides API + Sheets API.
 * Creates native Google Slides presentations in the user's Drive.
 * Charts are backed by embedded Google Sheets.
 */

import { google, type slides_v1, type sheets_v4 } from "googleapis";
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
  ExecutiveSummaryData,
} from "../types";

// ─── Color Helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): slides_v1.Schema$RgbColor {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function emu(inches: number): number {
  return Math.round(inches * 914400);
}

function pt(points: number): { magnitude: number; unit: string } {
  return { magnitude: points, unit: "PT" };
}

// ─── Renderer Implementation ─────────────────────────────────────────────────

export class GoogleSlidesRenderer implements DeckRenderer {
  private tokens!: DesignTokens;
  private slides: slides_v1.Slides;
  private sheets: sheets_v4.Sheets;
  private presentationId?: string;
  private spreadsheetId?: string;
  private slideRequests: slides_v1.Schema$Request[] = [];
  private slideIndex = 0;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    this.slides = google.slides({ version: "v1", auth });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  async initialize(tokens: DesignTokens): Promise<void> {
    this.tokens = tokens;

    // Create the presentation
    const presentation = await this.slides.presentations.create({
      requestBody: {
        title: "Prism Report",
        pageSize: {
          width: { magnitude: emu(13.333), unit: "EMU" },
          height: { magnitude: emu(7.5), unit: "EMU" },
        },
      },
    });
    this.presentationId = presentation.data.presentationId!;

    // Create a backing spreadsheet for chart data
    const spreadsheet = await this.sheets.spreadsheets.create({
      requestBody: { properties: { title: "Prism Chart Data" } },
    });
    this.spreadsheetId = spreadsheet.data.spreadsheetId!;

    // Delete the default blank slide
    const defaultSlideId = presentation.data.slides?.[0]?.objectId;
    if (defaultSlideId) {
      await this.slides.presentations.batchUpdate({
        presentationId: this.presentationId,
        requestBody: {
          requests: [{ deleteObject: { objectId: defaultSlideId } }],
        },
      });
    }
  }

  async addSlide(data: SlideData): Promise<void> {
    switch (data.type) {
      case "title":
        await this.addTitleSlide(data);
        break;
      case "kpi_overview":
        await this.addKPIOverviewSlide(data);
        break;
      case "campaign_breakdown":
        await this.addCampaignBreakdownSlide(data);
        break;
      case "trend_analysis":
        await this.addTrendAnalysisSlide(data);
        break;
      case "top_performers":
        await this.addTopPerformersSlide(data);
        break;
      case "executive_summary":
        await this.addExecutiveSummarySlide(data);
        break;
      case "audience_insights":
      case "budget_allocation":
      case "comparison":
        // For chart-heavy slides, fall back to text-based representation
        await this.addGenericTextSlide(data);
        break;
    }
    this.slideIndex++;
  }

  async finalize(): Promise<DeckOutput> {
    // Flush any remaining batched requests
    if (this.slideRequests.length > 0) {
      await this.slides.presentations.batchUpdate({
        presentationId: this.presentationId!,
        requestBody: { requests: this.slideRequests },
      });
      this.slideRequests = [];
    }

    const url = `https://docs.google.com/presentation/d/${this.presentationId}/edit`;
    return {
      kind: "url",
      url,
      title: "Prism Report",
    };
  }

  // ─── Slide Builders ──────────────────────────────────────────────────────

  private async addTitleSlide(data: TitleSlideData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;

    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      // Client name
      this.createTextBox(`${slideId}_client`, slideId, {
        x: 0.8, y: 1.5, w: 11.7, h: 0.6,
        text: data.clientName,
        fontSize: 16,
        color: this.tokens.colors.textSecondary,
      }),
      // Report title
      this.createTextBox(`${slideId}_title`, slideId, {
        x: 0.8, y: 2.1, w: 11.7, h: 1.2,
        text: data.reportTitle,
        fontSize: 36,
        bold: true,
        color: this.tokens.colors.primary,
      }),
      // Date range
      this.createTextBox(`${slideId}_date`, slideId, {
        x: 0.8, y: 3.5, w: 11.7, h: 0.5,
        text: data.dateRange,
        fontSize: 14,
        color: this.tokens.colors.textSecondary,
      }),
    ];

    await this.executeBatch(requests);
  }

  private async addKPIOverviewSlide(data: KPIOverviewData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;
    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: data.title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
    ];

    // KPI cards as text boxes
    const cols = Math.min(data.metrics.length, 4);
    const cardW = 11.7 / cols - 0.2;

    data.metrics.forEach((metric, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.8 + col * (cardW + 0.2);
      const y = 1.6 + row * 2.2;
      const boxId = `${slideId}_kpi_${i}`;

      // Card background
      requests.push({
        createShape: {
          objectId: `${boxId}_bg`,
          shapeType: "ROUND_RECTANGLE",
          elementProperties: {
            pageObjectId: slideId,
            size: { width: { magnitude: emu(cardW), unit: "EMU" }, height: { magnitude: emu(2.0), unit: "EMU" } },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: emu(x),
              translateY: emu(y),
              unit: "EMU",
            },
          },
        },
      });

      // Change indicator text
      const changeText = metric.change !== undefined
        ? `${metric.change >= 0 ? "\u25B2" : "\u25BC"} ${Math.abs(metric.change).toFixed(1)}%`
        : "";

      const kpiText = `${metric.label}\n${metric.value}${changeText ? "\n" + changeText : ""}`;

      requests.push(
        this.createTextBox(boxId, slideId, {
          x, y, w: cardW, h: 2.0,
          text: kpiText,
          fontSize: 14,
          color: this.tokens.colors.text,
        })
      );
    });

    await this.executeBatch(requests);
  }

  private async addCampaignBreakdownSlide(data: CampaignBreakdownData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;

    // Build table as text (Google Slides tables via API are complex)
    const header = "Campaign | " + Object.keys(data.campaigns[0]?.metrics ?? {}).join(" | ");
    const rows = data.campaigns.slice(0, 10).map(
      (c) => `${c.name} | ${Object.values(c.metrics).join(" | ")}`
    );
    const tableText = header + "\n" + "—".repeat(header.length) + "\n" + rows.join("\n");

    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: data.title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
      this.createTextBox(`${slideId}_table`, slideId, {
        x: 0.8, y: 1.4, w: 11.7, h: 5.5,
        text: tableText,
        fontSize: 10,
        color: this.tokens.colors.text,
      }),
    ];

    await this.executeBatch(requests);
  }

  private async addTrendAnalysisSlide(data: TrendAnalysisData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;

    // Write chart data to the backing spreadsheet
    const sheetName = `Trend_${this.slideIndex}`;
    const headers = ["Date", ...data.metrics];
    const rows = data.timeSeries.map((ts) => [
      ts.date,
      ...data.metrics.map((m) => ts.metrics[m] ?? 0),
    ]);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId!,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...rows] },
    }).catch(async () => {
      // Sheet might not exist — create it
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId!,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId!,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers, ...rows] },
      });
    });

    // Create slide with text summary (chart embedding requires more complex flow)
    const summaryText = `${data.metrics.join(", ")} over ${data.timeSeries.length} days\nData backed by Google Sheet for chart creation.`;

    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: data.title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
      this.createTextBox(`${slideId}_summary`, slideId, {
        x: 0.8, y: 1.4, w: 11.7, h: 5.5,
        text: summaryText,
        fontSize: 12,
        color: this.tokens.colors.textSecondary,
      }),
    ];

    await this.executeBatch(requests);
  }

  private async addTopPerformersSlide(data: TopPerformersData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;
    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: data.title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
    ];

    data.items.slice(0, 5).forEach((item, idx) => {
      const y = 1.4 + idx * 1.1;
      const secondaryText = item.secondaryMetrics.map((m) => `${m.label}: ${m.value}`).join("  |  ");

      requests.push(
        this.createTextBox(`${slideId}_perf_${idx}`, slideId, {
          x: 0.8, y, w: 11.7, h: 1.0,
          text: `#${item.rank}  ${item.name}\n${item.primaryMetric.label}: ${item.primaryMetric.value}    ${secondaryText}`,
          fontSize: 12,
          color: this.tokens.colors.text,
        })
      );
    });

    await this.executeBatch(requests);
  }

  private async addExecutiveSummarySlide(data: ExecutiveSummaryData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;
    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: data.title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
      this.createTextBox(`${slideId}_summary`, slideId, {
        x: 0.8, y: 1.4, w: 11.7, h: 5.5,
        text: data.summary,
        fontSize: 14,
        color: this.tokens.colors.text,
      }),
    ];

    await this.executeBatch(requests);
  }

  private async addGenericTextSlide(data: SlideData): Promise<void> {
    const slideId = `slide_${this.slideIndex}`;
    const title = "title" in data ? (data as { title: string }).title : "Slide";
    const requests: slides_v1.Schema$Request[] = [
      { createSlide: { objectId: slideId, insertionIndex: this.slideIndex } },
      this.createTextBox(`${slideId}_header`, slideId, {
        x: 0.8, y: 0.4, w: 11.7, h: 0.6,
        text: title,
        fontSize: 22,
        bold: true,
        color: this.tokens.colors.primary,
      }),
      this.createTextBox(`${slideId}_body`, slideId, {
        x: 0.8, y: 1.4, w: 11.7, h: 5.5,
        text: JSON.stringify(data, null, 2).slice(0, 2000),
        fontSize: 9,
        color: this.tokens.colors.textSecondary,
      }),
    ];

    await this.executeBatch(requests);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private createTextBox(
    objectId: string,
    pageId: string,
    opts: {
      x: number;
      y: number;
      w: number;
      h: number;
      text: string;
      fontSize: number;
      color: string;
      bold?: boolean;
    }
  ): slides_v1.Schema$Request {
    // We need to return multiple requests but our method signature
    // only returns one. We'll batch the text insertion separately.
    // For now, return the shape creation and queue the text insert.

    this.slideRequests.push(
      {
        createShape: {
          objectId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: pageId,
            size: {
              width: { magnitude: emu(opts.w), unit: "EMU" },
              height: { magnitude: emu(opts.h), unit: "EMU" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: emu(opts.x),
              translateY: emu(opts.y),
              unit: "EMU",
            },
          },
        },
      },
      {
        insertText: {
          objectId,
          text: opts.text,
        },
      },
      {
        updateTextStyle: {
          objectId,
          style: {
            fontSize: pt(opts.fontSize),
            foregroundColor: { opaqueColor: { rgbColor: hexToRgb(opts.color) } },
            bold: opts.bold ?? false,
            fontFamily: this.tokens.fonts.body,
          },
          textRange: { type: "ALL" },
          fields: "fontSize,foregroundColor,bold,fontFamily",
        },
      }
    );

    // Return a no-op placeholder — actual work is in slideRequests
    return { createSlide: undefined } as unknown as slides_v1.Schema$Request;
  }

  private async executeBatch(requests: slides_v1.Schema$Request[]): Promise<void> {
    // Combine explicit requests with queued slideRequests
    const allRequests = [
      ...requests.filter((r) => r.createSlide !== undefined || r.createShape !== undefined),
      ...this.slideRequests,
    ];
    this.slideRequests = [];

    if (allRequests.length === 0) return;

    await this.slides.presentations.batchUpdate({
      presentationId: this.presentationId!,
      requestBody: { requests: allRequests },
    });
  }
}
