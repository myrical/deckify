import { NextResponse } from "next/server";
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
  let clientId: string | undefined;
  let shop = shopParam ?? "";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      clientId = parsed.clientId;
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

  try {
    const connector = new ShopifyConnector();
    const tokenSet = await connector.authorize({
      code,
      state: stateRaw ?? undefined,
      redirectUri: `${process.env.NEXTAUTH_URL}/api/shopify/callback`,
      shop,
    });

    // In a full implementation, store the tokenSet encrypted in the database
    // linked to the client's Shopify account.
    const params = new URLSearchParams({
      success: "shopify_connected",
      ...(clientId ? { clientId } : {}),
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
