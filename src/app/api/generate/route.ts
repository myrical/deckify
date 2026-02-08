/**
 * Deck Generation API Route (SSE Streaming)
 *
 * Accepts deck config, pulls ad data, composes slides, and streams
 * progress events back to the client. Returns the generated deck
 * as a download link or inline base64.
 */

import { NextResponse } from "next/server";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { GoogleAdsConnector } from "@/core/ad-platforms/google-ads";
import { PptxRenderer } from "@/core/deck/pptx";
import { GoogleSlidesRenderer } from "@/core/deck/google-slides";
import { composeDeck } from "@/core/deck/composer";
import { NoopAnalyzer } from "@/core/analysis/noop-analyzer";
import { PrismError } from "@/core/errors/types";
import type { AdPlatformConnector, AccountSummary, MetricKey } from "@/core/ad-platforms/types";
import type { DeckConfig, DeckRenderer, SlideSelection } from "@/core/deck/types";

interface GenerateRequest {
  clientName: string;
  reportTitle: string;
  outputFormat: "pptx" | "google_slides";
  accounts: Array<{
    platform: "meta" | "google";
    accountId: string;
    accessToken: string;
  }>;
  dateRange: {
    start: string; // ISO date
    end: string;
  };
  slides: Array<{
    type: string;
    enabled: boolean;
    order: number;
  }>;
  metrics?: MetricKey[];
  googleSlidesAccessToken?: string; // for Google Slides output (just-in-time auth)
}

function getConnector(platform: "meta" | "google"): AdPlatformConnector {
  switch (platform) {
    case "meta":
      return new MetaAdsConnector();
    case "google":
      return new GoogleAdsConnector();
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

function getRenderer(format: "pptx" | "google_slides", googleToken?: string): DeckRenderer {
  switch (format) {
    case "pptx":
      return new PptxRenderer();
    case "google_slides":
      if (!googleToken) throw new Error("Google Slides access token required");
      return new GoogleSlidesRenderer(googleToken);
    default:
      throw new Error(`Unknown output format: ${format}`);
  }
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          sendEvent("progress", { message: "Starting deck generation..." });

          // 1. Pull data from all connected accounts in parallel
          sendEvent("progress", { message: "Pulling ad data..." });

          const accountSummaries: AccountSummary[] = await Promise.all(
            body.accounts.map(async (acc) => {
              const connector = getConnector(acc.platform);
              sendEvent("progress", {
                message: `Fetching ${acc.platform === "meta" ? "Meta" : "Google"} Ads data...`,
              });

              return connector.fetchAccountSummary({
                accountId: acc.accountId,
                tokenSet: {
                  accessToken: acc.accessToken,
                  scopes: ["ads_read"],
                  platform: acc.platform,
                },
                dateRange: {
                  start: new Date(body.dateRange.start),
                  end: new Date(body.dateRange.end),
                },
                level: "campaign",
                metrics: body.metrics ?? ["spend", "impressions", "clicks", "conversions", "roas", "ctr", "cpc", "cpa"],
              });
            })
          );

          // 2. Set up renderer
          sendEvent("progress", { message: "Setting up deck renderer..." });
          const renderer = getRenderer(body.outputFormat, body.googleSlidesAccessToken);

          // 3. Compose and generate the deck
          const config: DeckConfig = {
            clientName: body.clientName,
            reportTitle: body.reportTitle,
            outputFormat: body.outputFormat,
            slides: body.slides as SlideSelection[],
          };

          const analyzer = new NoopAnalyzer();

          const output = await composeDeck({
            config,
            accounts: accountSummaries,
            renderer,
            analyzer,
            onProgress: (message) => sendEvent("progress", { message }),
          });

          // 4. Return result
          if (output.kind === "file") {
            const base64 = output.buffer.toString("base64");
            sendEvent("complete", {
              kind: "file",
              filename: output.filename,
              mimeType: output.mimeType,
              data: base64,
            });
          } else {
            sendEvent("complete", {
              kind: "url",
              url: output.url,
              title: output.title,
            });
          }
        } catch (err) {
          if (err instanceof PrismError) {
            sendEvent("error", {
              message: err.message,
              code: err.code,
              recoveryAction: err.recoveryAction,
            });
          } else {
            sendEvent("error", {
              message: err instanceof Error ? err.message : "Unknown error",
              code: "UNKNOWN",
              recoveryAction: "abort_with_message",
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
