import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrg } from "@/lib/ensure-org";
import { GoogleAdsConnector } from "@/core/ad-platforms/google-ads/connector";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=google_auth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=google_no_code`
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=not_authenticated`
    );
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!googleClientId || !googleClientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=google_not_configured`
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "");
      console.error("Google token exchange failed:", errorBody);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=google_token_exchange_failed`
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    const orgId = await ensureOrg(session.user.id);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const scopes = tokenData.scope ? tokenData.scope.split(" ") : [];

    // Upsert PlatformAuth for Google
    const platformAuth = await db.platformAuth.upsert({
      where: {
        orgId_platform_platformUserId: {
          orgId,
          platform: "google",
          platformUserId: session.user.id,
        },
      },
      create: {
        platform: "google",
        orgId,
        connectedByUserId: session.user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        scopes,
        platformUserId: session.user.id,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        scopes,
        status: "active",
        lastRefreshedAt: new Date(),
      },
    });

    // Discover all accessible Google Ads accounts
    let accountCount = 0;
    try {
      const connector = new GoogleAdsConnector();
      const tokenSet = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scopes,
        platform: "google" as const,
      };

      const adAccounts = await connector.listAccounts(tokenSet);
      accountCount = adAccounts.length;

      for (const account of adAccounts) {
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
    } catch (listErr) {
      // If account discovery fails (e.g. no developer token), create a placeholder
      console.error("[Google Callback] Account discovery failed, creating placeholder:", listErr);
      accountCount = 1;
      await db.adAccount.upsert({
        where: {
          platform_platformId: {
            platform: "google",
            platformId: `google_${session.user.id}`,
          },
        },
        create: {
          platform: "google",
          platformId: `google_${session.user.id}`,
          name: "Google Ads Account",
          currency: "USD",
          timezone: "America/New_York",
          status: "active",
          platformAuthId: platformAuth.id,
        },
        update: {
          status: "active",
          platformAuthId: platformAuth.id,
        },
      });
    }

    await db.platformAuth.update({
      where: { id: platformAuth.id },
      data: { lastSyncAt: new Date() },
    });

    const params = new URLSearchParams({
      success: "google_connected",
      accounts: String(accountCount),
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?${params}`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/data-sources?error=google_connection_failed`
    );
  }
}
