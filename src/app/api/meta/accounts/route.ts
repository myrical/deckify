import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MetaAdsConnector } from "@/core/ad-platforms/meta";
import { PrismError } from "@/core/errors/types";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await db.orgMembership.findFirst({
      where: { userId: session.user.id },
      select: { orgId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const platformAuths = await db.platformAuth.findMany({
      where: {
        orgId: membership.orgId,
        platform: "meta",
        status: "active",
      },
      select: {
        accessToken: true,
        refreshToken: true,
        scopes: true,
      },
    });
    if (platformAuths.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    const connector = new MetaAdsConnector();
    const accountSets = await Promise.all(
      platformAuths.map((auth) =>
        connector.listAccounts({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken ?? undefined,
          scopes: auth.scopes,
          platform: "meta",
        })
      )
    );

    const deduped = new Map<string, (typeof accountSets)[number][number]>();
    for (const set of accountSets) {
      for (const account of set) {
        deduped.set(account.id, account);
      }
    }

    return NextResponse.json({ accounts: Array.from(deduped.values()) });
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
