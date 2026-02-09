import { NextResponse } from "next/server";
import { ShopifyConnector } from "@/core/ad-platforms/shopify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const shop = searchParams.get("shop");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  if (!shop) {
    return NextResponse.json({ error: "shop domain is required (e.g. mystore.myshopify.com)" }, { status: 400 });
  }

  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Shopify is not configured. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET environment variables." },
      { status: 501 }
    );
  }

  const connector = new ShopifyConnector();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;
  // Encode both clientId and shop domain in state so we can retrieve them on callback
  const state = JSON.stringify({ clientId, shop });
  const authUrl = connector.getAuthUrl(redirectUri, state, shop);

  return NextResponse.redirect(authUrl);
}
