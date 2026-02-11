/**
 * Deck Generation API Route (SSE Streaming)
 *
 * Accepts deck config, pulls ad data, composes slides, and streams
 * progress events back to the client. Returns the generated deck
 * as a download link or inline base64.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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

const DEFAULT_METRICS: MetricKey[] = [
  "spend",
  "impressions",
  "clicks",
  "conversions",
  "roas",
  "ctr",
  "cpc",
  "cpa",
];

function isPlatform(value: unknown): value is "meta" | "google" {
  return value === "meta" || value === "google";
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateGenerateRequest(body: unknown): GenerateRequest | null {
  if (!body || typeof body !== "object") return null;
  const parsed = body as Partial<GenerateRequest>;
  if (typeof parsed.clientName !== "string" || !parsed.clientName.trim()) return null;
  if (typeof parsed.reportTitle !== "string" || !parsed.reportTitle.trim()) return null;
  if (parsed.outputFormat !== "pptx" && parsed.outputFormat !== "google_slides") return null;
  if (!Array.isArray(parsed.accounts) || parsed.accounts.length === 0 || parsed.accounts.length > 20) return null;
  if (!Array.isArray(parsed.slides)) return null;
  if (!parsed.dateRange || typeof parsed.dateRange !== "object") return null;

  const start = parseDate((parsed.dateRange as { start?: unknown }).start);
  const end = parseDate((parsed.dateRange as { end?: unknown }).end);
  if (!start || !end || start > end) return null;

  for (const account of parsed.accounts) {
    if (!account || typeof account !== "object") return null;
    if (!isPlatform((account as { platform?: unknown }).platform)) return null;
    if (typeof (account as { accountId?: unknown }).accountId !== "string") return null;
    if (!(account as { accountId?: string }).accountId?.trim()) return null;
  }

  return parsed as GenerateRequest;
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await db.orgMembership.findFirst({
      where: { userId: session.user.id },
      select: { orgId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const rawBody: unknown = await request.json();
    const body = validateGenerateRequest(rawBody);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const requestedAccounts = body.accounts.map((acc) => ({
      platform: acc.platform,
      platformId: acc.accountId,
    }));
    const accounts = await db.adAccount.findMany({
      where: {
        OR: requestedAccounts,
        isActive: true,
        platformAuth: {
          orgId: membership.orgId,
          status: "active",
        },
      },
      include: {
        platformAuth: {
          select: {
            accessToken: true,
            refreshToken: true,
            scopes: true,
            platformMeta: true,
          },
        },
      },
    });

    const accountMap = new Map(
      accounts.map((acc) => [`${acc.platform}:${acc.platformId}`, acc])
    );
    const hasAllRequestedAccounts = requestedAccounts.every((acc) =>
      accountMap.has(`${acc.platform}:${acc.platformId}`)
    );
    if (!hasAllRequestedAccounts) {
      return NextResponse.json(
        { error: "One or more accounts are invalid or not owned by your organization" },
        { status: 403 }
      );
    }

    const dateRange = {
      start: new Date(body.dateRange.start),
      end: new Date(body.dateRange.end),
    };

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
              const dbAccount = accountMap.get(`${acc.platform}:${acc.accountId}`);
              if (!dbAccount) {
                throw new Error(`Unauthorized account: ${acc.platform}:${acc.accountId}`);
              }
              sendEvent("progress", {
                message: `Fetching ${acc.platform === "meta" ? "Meta" : "Google"} Ads data...`,
              });

              const managerMap = (dbAccount.platformAuth.platformMeta as { managerMap?: Record<string, string> } | null)?.managerMap;
              const loginCustomerId = acc.platform === "google"
                ? managerMap?.[dbAccount.platformId]
                : undefined;

              return connector.fetchAccountSummary({
                accountId: dbAccount.platformId,
                tokenSet: {
                  accessToken: dbAccount.platformAuth.accessToken,
                  refreshToken: dbAccount.platformAuth.refreshToken ?? undefined,
                  scopes: dbAccount.platformAuth.scopes,
                  platform: acc.platform,
                },
                dateRange,
                loginCustomerId,
                level: "campaign",
                metrics: body.metrics ?? DEFAULT_METRICS,
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
