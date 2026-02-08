import { NextResponse } from "next/server";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const connector = new MetaAdsConnector();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;
  const authUrl = connector.getAuthUrl(redirectUri, clientId);

  return NextResponse.redirect(authUrl);
}
