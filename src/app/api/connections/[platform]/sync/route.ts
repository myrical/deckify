import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";

/** POST /api/connections/[platform]/sync — re-discover accounts for a connected platform */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const platformAuth = await db.platformAuth.findFirst({
    where: {
      orgId: membership.orgId,
      platform,
      status: "active",
    },
  });

  if (!platformAuth) {
    return NextResponse.json({ error: "No active connection for this platform" }, { status: 404 });
  }

  if (platform === "meta") {
    const connector = new MetaAdsConnector();
    const tokenSet = {
      accessToken: platformAuth.accessToken,
      expiresAt: platformAuth.tokenExpiresAt ?? undefined,
      scopes: platformAuth.scopes,
      platform: "meta" as const,
    };

    const adAccounts = await connector.listAccounts(tokenSet);

    let newCount = 0;
    for (const account of adAccounts) {
      const existing = await db.adAccount.findUnique({
        where: {
          platform_platformId: {
            platform: "meta",
            platformId: account.id,
          },
        },
      });

      if (!existing) newCount++;

      await db.adAccount.upsert({
        where: {
          platform_platformId: {
            platform: "meta",
            platformId: account.id,
          },
        },
        create: {
          platform: "meta",
          platformId: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          status: account.status,
          platformAuthId: platformAuth.id,
        },
        update: {
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          status: account.status,
          platformAuthId: platformAuth.id,
        },
      });
    }

    await db.platformAuth.update({
      where: { id: platformAuth.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      synced: adAccounts.length,
      newAccounts: newCount,
    });
  }

  // TODO: Add Google and Shopify sync when connectors are available
  return NextResponse.json({ error: "Sync not supported for this platform yet" }, { status: 501 });
}
