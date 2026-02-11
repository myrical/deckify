import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/clients/[id] — fetch client detail with assigned data sources */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const client = await db.client.findUnique({
    where: { id },
    include: { adAccounts: true },
  });
  if (!client || client.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      createdAt: client.createdAt.toISOString(),
      adAccounts: client.adAccounts.map((acc) => ({
        id: acc.id,
        platform: acc.platform,
        platformId: acc.platformId,
        name: acc.name,
        status: acc.status,
        isActive: acc.isActive,
      })),
    },
  });
}

/** PATCH /api/clients/[id] — rename a client */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const updated = await db.client.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json({ client: { id: updated.id, name: updated.name } });
}

/** DELETE /api/clients/[id] — delete a client (unassigns data sources) */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const client = await db.client.findUnique({
    where: { id },
    include: { _count: { select: { adAccounts: true } } },
  });

  if (!client || client.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Unassign all data sources first
  await db.adAccount.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });

  await db.client.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
