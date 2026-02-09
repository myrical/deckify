import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** POST /api/data-sources/bulk-assign — assign multiple data sources to a client */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { dataSourceIds, clientId } = body as {
    dataSourceIds: string[];
    clientId: string | null;
  };

  if (!Array.isArray(dataSourceIds) || dataSourceIds.length === 0) {
    return NextResponse.json({ error: "dataSourceIds array is required" }, { status: 400 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Verify client belongs to this org (if assigning, not unassigning)
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.orgId !== membership.orgId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  // Verify all data sources belong to this org
  const accounts = await db.adAccount.findMany({
    where: { id: { in: dataSourceIds } },
    include: { platformAuth: { select: { orgId: true } } },
  });

  const allOwnedByOrg = accounts.every((a) => a.platformAuth.orgId === membership.orgId);
  if (!allOwnedByOrg || accounts.length !== dataSourceIds.length) {
    return NextResponse.json({ error: "One or more data sources not found" }, { status: 404 });
  }

  await db.adAccount.updateMany({
    where: { id: { in: dataSourceIds } },
    data: { clientId: clientId ?? null },
  });

  return NextResponse.json({ updated: dataSourceIds.length });
}
