import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrg } from "@/lib/ensure-org";
import { ShopifyConnector } from "@/core/ad-platforms/shopify";
import { PrismError } from "@/core/errors/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const shopParam = searchParams.get("shop");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=shopify_no_code`
    );
  }

  // Recover shop from state
  let shop = shopParam ?? "";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      if (parsed.shop) shop = parsed.shop;
    }
  } catch {
    // state wasn't JSON; use shopParam fallback
  }

  if (!shop) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=shopify_no_shop`
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=not_authenticated`
    );
  }

  try {
    const connector = new ShopifyConnector();
    const tokenSet = await connector.authorize({
      code,
      state: stateRaw ?? undefined,
      redirectUri: `${process.env.NEXTAUTH_URL}/api/shopify/callback`,
      shop,
    });

    const orgId = await ensureOrg(session.user.id);

    // Shopify: one auth = one shop, so platformUserId is the shop domain
    const platformAuth = await db.platformAuth.upsert({
      where: {
        orgId_platform_platformUserId: {
          orgId,
          platform: "shopify",
          platformUserId: shop,
        },
      },
      create: {
        platform: "shopify",
        orgId,
        connectedByUserId: session.user.id,
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? null,
        tokenExpiresAt: tokenSet.expiresAt ?? null,
        scopes: tokenSet.scopes,
        platformUserId: shop,
        platformMeta: { shop },
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

    // Create the single ad account for this shop (unassigned)
    await db.adAccount.upsert({
      where: {
        platform_platformId: {
          platform: "shopify",
          platformId: shop,
        },
      },
      create: {
        platform: "shopify",
        platformId: shop,
        name: shop,
        currency: "USD",
        timezone: "America/New_York",
        status: "active",
        platformAuthId: platformAuth.id,
      },
      update: {
        name: shop,
        status: "active",
        platformAuthId: platformAuth.id,
      },
    });

    await db.platformAuth.update({
      where: { id: platformAuth.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?success=shopify_connected`
    );
  } catch (err) {
    console.error("[Shopify Callback Error]", err);
    const errCode = err instanceof PrismError ? err.code : "unknown_error";
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=${errCode}`
    );
  }
}
