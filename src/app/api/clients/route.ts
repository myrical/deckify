import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureOrg } from "@/lib/ensure-org";

/** GET /api/clients — list all clients for the current user's org */
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
          clients: {
            orderBy: { createdAt: "asc" },
            include: {
              adAccounts: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ clients: [] });
  }

  const clients = membership.organization.clients.map((client) => ({
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
  }));

  return NextResponse.json({ clients });
}

/** POST /api/clients — create a new client */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const orgId = await ensureOrg(session.user.id);

  const client = await db.client.create({
    data: { name, orgId },
  });

  return NextResponse.json({ client: { id: client.id, name: client.name, createdAt: client.createdAt.toISOString(), adAccounts: [] } }, { status: 201 });
}
