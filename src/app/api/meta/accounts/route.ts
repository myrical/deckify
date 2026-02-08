import { NextResponse } from "next/server";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { PrismError } from "@/core/errors/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken is required" },
        { status: 400 }
      );
    }

    const connector = new MetaAdsConnector();
    const accounts = await connector.listAccounts({
      accessToken,
      scopes: ["ads_read"],
      platform: "meta",
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    if (err instanceof PrismError) {
      return NextResponse.json(
        { error: err.message, code: err.code, recoveryAction: err.recoveryAction },
        { status: err.code === "TOKEN_EXPIRED" ? 401 : 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
