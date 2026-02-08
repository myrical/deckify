import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrgAndClient } from "@/lib/ensure-org";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // clientId passed as state
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=google_auth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=google_no_code`
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
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!googleClientId || !googleClientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=google_not_configured`
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

    // Exchange authorization code for tokens using raw fetch
    // (avoids requiring GOOGLE_ADS_DEVELOPER_TOKEN for the OAuth flow)
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
        `${process.env.NEXTAUTH_URL}/dashboard?error=google_token_exchange_failed`
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    // Ensure org and client exist for this user
    const { clientId } = await ensureOrgAndClient(session.user.id);

    // Create a placeholder AdAccount for Google Ads.
    // We use the user ID as a temporary platformId since listing actual
    // Google Ads customer IDs requires the developer token (which the user
    // might not have yet). This will be updated when they first fetch data.
    const placeholderPlatformId = `google_${session.user.id}`;

    const adAccount = await db.adAccount.upsert({
      where: {
        platform_platformId: {
          platform: "google",
          platformId: placeholderPlatformId,
        },
      },
      create: {
        platform: "google",
        platformId: placeholderPlatformId,
        name: "Google Ads Account",
        currency: "USD",
        timezone: "America/New_York",
        status: "active",
        clientId,
      },
      update: {
        name: "Google Ads Account",
        status: "active",
      },
    });

    // Upsert the connection with tokens
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const scopes = tokenData.scope ? tokenData.scope.split(" ") : [];

    await db.adConnection.upsert({
      where: { adAccountId: adAccount.id },
      create: {
        adAccountId: adAccount.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        scopes,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        scopes,
        lastRefreshedAt: new Date(),
      },
    });

    const params = new URLSearchParams({
      success: "google_connected",
      ...(state ? { clientId: state } : {}),
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?${params}`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=google_connection_failed`
    );
  }
}
