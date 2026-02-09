import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find the user's org → platformAuths (org-level connections)
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          platformAuths: {
            where: { status: "active" },
            include: {
              connectedBy: { select: { name: true, email: true } },
              adAccounts: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ connections: [], dataSources: [] });
  }

  // Platform-level connections (for the ConnectAccounts UI)
  const connections = membership.organization.platformAuths.map((auth) => ({
    platform: auth.platform,
    connected: true,
    connectedBy: auth.connectedBy.name ?? auth.connectedBy.email ?? "Unknown",
    connectedAt: auth.connectedAt.toISOString(),
    lastSyncAt: auth.lastSyncAt?.toISOString() ?? null,
    accountCount: auth.adAccounts.length,
  }));

  // All data sources (ad accounts) across all platform auths
  const dataSources = membership.organization.platformAuths.flatMap((auth) =>
    auth.adAccounts.map((account) => ({
      id: account.id,
      platform: account.platform,
      platformId: account.platformId,
      name: account.name,
      status: account.status,
      clientId: account.clientId,
      isActive: account.isActive,
    }))
  );

  return NextResponse.json({ connections, dataSources });
}
