import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getMetaAnalytics,
  getGoogleAnalytics,
  getShopifyAnalytics,
  getOverviewByClient,
} from "@/lib/analytics";
import type { DateRange } from "@/core/ad-platforms/types";

/** GET /api/analytics?platform=meta&clientId=xxx&start=2025-01-01&end=2025-01-07 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "overview";
  const clientId = searchParams.get("clientId");
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  const dateRange: DateRange | undefined =
    startStr && endStr
      ? { start: new Date(startStr), end: new Date(endStr) }
      : undefined;

  try {
    if (platform === "overview") {
      const data = await getOverviewByClient(membership.orgId);
      return NextResponse.json({ data });
    }

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required for platform analytics" }, { status: 400 });
    }

    // Verify client belongs to org
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.orgId !== membership.orgId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (platform === "meta") {
      const data = await getMetaAnalytics(clientId, dateRange);
      return NextResponse.json({ data });
    }

    if (platform === "google") {
      const data = await getGoogleAnalytics(clientId, dateRange);
      return NextResponse.json({ data });
    }

    if (platform === "shopify") {
      const data = await getShopifyAnalytics(clientId, dateRange);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  } catch (err) {
    console.error("[Analytics API Error]", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
