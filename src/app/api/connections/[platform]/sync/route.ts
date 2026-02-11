import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { GoogleAdsConnector } from "@/core/ad-platforms/google-ads/connector";

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

  if (platform === "google") {
    try {
      const connector = new GoogleAdsConnector();
      const tokenSet = {
        accessToken: platformAuth.accessToken,
        refreshToken: platformAuth.refreshToken ?? undefined,
        expiresAt: platformAuth.tokenExpiresAt ?? undefined,
        scopes: platformAuth.scopes,
        platform: "google" as const,
      };

      console.log("[Google Sync] Starting account discovery...");
      const adAccounts = await connector.listAccounts(tokenSet);
      console.log(`[Google Sync] Found ${adAccounts.length} accounts:`, adAccounts.map(a => `${a.id} (${a.name})${a.managerCustomerId ? ` [MCC: ${a.managerCustomerId}]` : ""}`));

      // Build a managerMap: { subAccountId → managerCustomerId }
      const managerMap: Record<string, string> = {};
      for (const account of adAccounts) {
        if (account.managerCustomerId) {
          managerMap[account.id] = account.managerCustomerId;
        }
      }

      let newCount = 0;
      for (const account of adAccounts) {
        const existing = await db.adAccount.findUnique({
          where: {
            platform_platformId: {
              platform: "google",
              platformId: account.id,
            },
          },
        });

        if (!existing) newCount++;

        await db.adAccount.upsert({
          where: {
            platform_platformId: {
              platform: "google",
              platformId: account.id,
            },
          },
          create: {
            platform: "google",
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

      // Remove the old placeholder account if real accounts were discovered
      if (adAccounts.length > 0) {
        const userId = session.user.id;
        await db.adAccount.deleteMany({
          where: {
            platform: "google",
            platformId: `google_${userId}`,
          },
        });
      }

      // Store the manager mapping in platformMeta and update lastSyncAt
      const existingMeta = (platformAuth.platformMeta as Record<string, unknown>) ?? {};
      await db.platformAuth.update({
        where: { id: platformAuth.id },
        data: {
          lastSyncAt: new Date(),
          ...(Object.keys(managerMap).length > 0
            ? { platformMeta: { ...existingMeta, managerMap } }
            : {}),
        },
      });
      if (Object.keys(managerMap).length > 0) {
        console.log("[Google Sync] Stored managerMap:", managerMap);
      }

      return NextResponse.json({
        synced: adAccounts.length,
        newAccounts: newCount,
      });
    } catch (err) {
      console.error("[Google Sync] Account discovery failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Google sync failed: ${message}` }, { status: 500 });
    }
  }

  // TODO: Add Shopify sync when connector is available
  return NextResponse.json({ error: "Sync not supported for this platform yet" }, { status: 501 });
}
