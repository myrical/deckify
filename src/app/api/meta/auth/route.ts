import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return NextResponse.json(
      { error: "Meta Ads is not configured. Set META_APP_ID and META_APP_SECRET environment variables." },
      { status: 501 }
    );
  }

  const connector = new MetaAdsConnector();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;
  const stateData = createOAuthState("meta", { clientId });
  const authUrl = connector.getAuthUrl(redirectUri, stateData.state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(stateData.cookieName, stateData.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: stateData.maxAge,
  });
  return response;
}
