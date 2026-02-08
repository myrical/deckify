import { NextResponse } from "next/server";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { DeckifyError } from "@/core/errors/types";

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

  try {
    const connector = new MetaAdsConnector();
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;

    const tokenSet = await connector.authorize({
      code,
      state: state ?? undefined,
      redirectUri,
    });

    // In a full implementation, we'd store the tokenSet encrypted in the
    // AdConnection table linked to the client's ad account.
    // For now, redirect with a success indicator.
    const params = new URLSearchParams({
      success: "meta_connected",
      ...(state ? { clientId: state } : {}),
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?${params}`
    );
  } catch (err) {
    const message = err instanceof DeckifyError ? err.code : "unknown_error";
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=${message}`
    );
  }
}
