import { NextResponse } from "next/server";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";

export async function GET(request: Request) {
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
  const authUrl = connector.getAuthUrl(redirectUri, clientId);

  return NextResponse.redirect(authUrl);
}
