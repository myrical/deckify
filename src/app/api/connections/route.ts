import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find the user's org membership → org → clients → adAccounts with connections
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          clients: {
            include: {
              adAccounts: {
                include: {
                  connection: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ connections: [] });
  }

  // Flatten the nested structure into a list of connections
  const connections = membership.organization.clients.flatMap((client) =>
    client.adAccounts
      .filter((account) => account.connection !== null)
      .map((account) => ({
        platform: account.platform,
        connected: true,
        accountName: account.name,
        accountId: account.platformId,
        connectedAt: account.connection!.connectedAt.toISOString(),
        status: account.status,
      }))
  );

  return NextResponse.json({ connections });
}
