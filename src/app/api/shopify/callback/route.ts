import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrgAndClient } from "@/lib/ensure-org";
import { ShopifyConnector } from "@/core/ad-platforms/shopify";
import { PrismError } from "@/core/errors/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const shopParam = searchParams.get("shop");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=shopify_no_code`
    );
  }

  // Recover clientId and shop from state
  let stateClientId: string | undefined;
  let shop = shopParam ?? "";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      stateClientId = parsed.clientId;
      if (parsed.shop) shop = parsed.shop;
    }
  } catch {
    // state wasn't JSON; use shopParam fallback
  }

  if (!shop) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=shopify_no_shop`
    );
  }

  // Get the current user session
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

    // Ensure org and client exist for this user
    const { clientId } = await ensureOrgAndClient(session.user.id);

    // Use the shop domain as the platformId for uniqueness
    // and store it in the name field as well for display
    const adAccount = await db.adAccount.upsert({
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
        clientId,
      },
      update: {
        name: shop,
        status: "active",
      },
    });

    // Upsert the connection with tokens
    // Shopify offline tokens don't expire
    await db.adConnection.upsert({
      where: { adAccountId: adAccount.id },
      create: {
        adAccountId: adAccount.id,
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? null,
        tokenExpiresAt: tokenSet.expiresAt ?? null,
        scopes: tokenSet.scopes,
      },
      update: {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? null,
        tokenExpiresAt: tokenSet.expiresAt ?? null,
        scopes: tokenSet.scopes,
        lastRefreshedAt: new Date(),
      },
    });

    const params = new URLSearchParams({
      success: "shopify_connected",
      ...(stateClientId ? { clientId: stateClientId } : {}),
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?${params}`
    );
  } catch (err) {
    const message = err instanceof PrismError ? err.code : "unknown_error";
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=${message}`
    );
  }
}
