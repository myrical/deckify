import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ShopifyConnector } from "@/core/ad-platforms/shopify";
import { createOAuthState } from "@/lib/oauth-state";

function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const shop = searchParams.get("shop");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  if (!shop) {
    return NextResponse.json({ error: "shop domain is required (e.g. mystore.myshopify.com)" }, { status: 400 });
  }
  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "shop must be a valid *.myshopify.com domain" }, { status: 400 });
  }

  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Shopify is not configured. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET environment variables." },
      { status: 501 }
    );
  }

  const connector = new ShopifyConnector();
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;
  const stateData = createOAuthState("shopify", { clientId, shop });
  const authUrl = connector.getAuthUrl(redirectUri, stateData.state, shop);

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
