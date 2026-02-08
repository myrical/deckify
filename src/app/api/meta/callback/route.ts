import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrgAndClient } from "@/lib/ensure-org";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { PrismError } from "@/core/errors/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // clientId passed as state
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=meta_auth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=meta_no_code`
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
    const connector = new MetaAdsConnector();
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;

    // Exchange code for tokens
    const tokenSet = await connector.authorize({
      code,
      state: state ?? undefined,
      redirectUri,
    });

    // Ensure org and client exist for this user
    const { clientId } = await ensureOrgAndClient(session.user.id);

    // List the user's ad accounts from Meta
    const adAccounts = await connector.listAccounts(tokenSet);

    // For each ad account, upsert AdAccount + create/update AdConnection
    for (const account of adAccounts) {
      const adAccount = await db.adAccount.upsert({
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
          clientId,
        },
        update: {
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          status: account.status,
        },
      });

      // Upsert the connection (one-to-one via unique adAccountId)
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
    }

    const params = new URLSearchParams({
      success: "meta_connected",
      ...(state ? { clientId: state } : {}),
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
