import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json(
      { error: "Google Ads is not configured. Set GOOGLE_CLIENT_ID environment variable." },
      { status: 501 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

  const stateData = createOAuthState("google", { clientId });

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline",
    prompt: "consent",
    state: stateData.state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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
