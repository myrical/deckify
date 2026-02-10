import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** DELETE /api/connections/[platform] — disconnect a platform (soft-delete: set status to "revoked") */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Find the platform auth for this org + platform
  const platformAuth = await db.platformAuth.findFirst({
    where: {
      orgId: membership.orgId,
      platform,
      status: "active",
    },
  });

  if (!platformAuth) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Unassign all ad accounts tied to this platform auth (remove client links)
  await db.adAccount.updateMany({
    where: { platformAuthId: platformAuth.id },
    data: { clientId: null },
  });

  // Mark the connection as revoked (soft delete — keeps ad account records for history)
  await db.platformAuth.update({
    where: { id: platformAuth.id },
    data: { status: "revoked" },
  });

  return NextResponse.json({ disconnected: platform });
}
