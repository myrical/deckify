import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/data-sources — list all data sources for the user's org */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          platformAuths: {
            where: { status: "active" },
            include: { adAccounts: { include: { client: true } } },
          },
          clients: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ dataSources: [], clients: [] });
  }

  const dataSources = membership.organization.platformAuths.flatMap((auth) =>
    auth.adAccounts.map((acc) => ({
      id: acc.id,
      platform: acc.platform,
      platformId: acc.platformId,
      name: acc.name,
      status: acc.status,
      isActive: acc.isActive,
      clientId: acc.clientId,
      clientName: acc.client?.name ?? null,
    }))
  );

  const clients = membership.organization.clients.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return NextResponse.json({ dataSources, clients });
}

/** PATCH /api/data-sources — assign a data source to a client */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { dataSourceId, clientId } = body;

  if (!dataSourceId) {
    return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
  }

  // Verify user owns this data source via org membership
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Verify the ad account belongs to this org
  const adAccount = await db.adAccount.findUnique({
    where: { id: dataSourceId },
    include: { platformAuth: true },
  });

  if (!adAccount || adAccount.platformAuth.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }

  // If clientId provided, verify it belongs to the same org
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.orgId !== membership.orgId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  const updated = await db.adAccount.update({
    where: { id: dataSourceId },
    data: { clientId: clientId ?? null },
  });

  return NextResponse.json({
    dataSource: {
      id: updated.id,
      clientId: updated.clientId,
    },
  });
}
