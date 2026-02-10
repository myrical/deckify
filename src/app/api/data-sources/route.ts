import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/data-sources — list data sources with search, filter, pagination */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ dataSources: [], clients: [], total: 0, page: 1, limit: 25 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const status = searchParams.get("status") ?? "unassigned"; // unassigned | assigned | all
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));

  // Build Prisma where clause
  const orgId = membership.orgId;
  const where: Record<string, unknown> = {
    platformAuth: { orgId, status: "active" },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { platformId: { contains: search, mode: "insensitive" } },
    ];
  }

  if (platform && platform !== "all") {
    where.platform = platform;
  }

  if (status === "unassigned") {
    where.clientId = null;
  } else if (status === "assigned") {
    where.clientId = { not: null };
  }
  // status === "all" → no clientId filter

  const [dataSources, total, clients] = await Promise.all([
    db.adAccount.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.adAccount.count({ where }),
    db.client.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    dataSources: dataSources.map((acc) => ({
      id: acc.id,
      platform: acc.platform,
      platformId: acc.platformId,
      name: acc.name,
      status: acc.status,
      isActive: acc.isActive,
      clientId: acc.clientId,
      clientName: acc.client?.name ?? null,
    })),
    clients,
    total,
    page,
    limit,
  });
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

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const adAccount = await db.adAccount.findUnique({
    where: { id: dataSourceId },
    include: { platformAuth: true },
  });

  if (!adAccount || adAccount.platformAuth.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Data source not found" }, { status: 404 });
  }

  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.orgId !== membership.orgId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // One-channel-per-client enforcement
    const existing = await db.adAccount.findFirst({
      where: { clientId, platform: adAccount.platform, id: { not: dataSourceId } },
    });
    if (existing) {
      return NextResponse.json({
        error: `This client already has a ${adAccount.platform} account assigned (${existing.name}). Unassign it first.`,
        code: "CHANNEL_LIMIT",
        existingAccount: { id: existing.id, name: existing.name },
      }, { status: 409 });
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
