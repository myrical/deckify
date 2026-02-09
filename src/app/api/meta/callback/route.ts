import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrg } from "@/lib/ensure-org";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { PrismError } from "@/core/errors/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=meta_auth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=meta_no_code`
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=not_authenticated`
    );
  }

  try {
    const connector = new MetaAdsConnector();
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;

    // Exchange code for tokens
    const tokenSet = await connector.authorize({
      code,
      state: state ?? undefined,
      redirectUri,
    });

    // Ensure org exists for this user
    const orgId = await ensureOrg(session.user.id);

    // Upsert PlatformAuth (one per org + platform + user combo)
    const platformAuth = await db.platformAuth.upsert({
      where: {
        orgId_platform_platformUserId: {
          orgId,
          platform: "meta",
          platformUserId: session.user.id,
        },
      },
      create: {
        platform: "meta",
        orgId,
        connectedByUserId: session.user.id,
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? null,
        tokenExpiresAt: tokenSet.expiresAt ?? null,
        scopes: tokenSet.scopes,
        platformUserId: session.user.id,
      },
      update: {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? null,
        tokenExpiresAt: tokenSet.expiresAt ?? null,
        scopes: tokenSet.scopes,
        status: "active",
        lastRefreshedAt: new Date(),
      },
    });

    // Discover all ad accounts accessible with this token
    const adAccounts = await connector.listAccounts(tokenSet);

    // Upsert each as unassigned (clientId: null) — user organizes later
    for (const account of adAccounts) {
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

    // Update last sync time
    await db.platformAuth.update({
      where: { id: platformAuth.id },
      data: { lastSyncAt: new Date() },
    });

    const params = new URLSearchParams({
      success: "meta_connected",
      accounts: String(adAccounts.length),
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?${params}`
    );
  } catch (err) {
    console.error("[Meta Callback Error]", err);
    const errCode = err instanceof PrismError ? err.code : "unknown_error";
    const detail = err instanceof Error ? err.message : String(err);
    const params = new URLSearchParams({ error: errCode, detail });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?${params}`
    );
  }
}
