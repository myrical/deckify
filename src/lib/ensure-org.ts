/**
 * Ensure Organization & Client Helpers
 *
 * When a user connects a platform for the first time, auto-create:
 * 1. Organization (if user doesn't have one) named "My Workspace"
 * 2. OrgMembership linking user as "owner"
 * 3. Client named "Default" under that org
 *
 * Returns the org and client for use in ad account creation.
 */

import { db } from "@/lib/db";

interface OrgAndClient {
  orgId: string;
  clientId: string;
}

export async function ensureOrgAndClient(userId: string): Promise<OrgAndClient> {
  // Check if user already has an org membership
  const existingMembership = await db.orgMembership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          clients: {
            take: 1,
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (existingMembership) {
    const org = existingMembership.organization;
    // If org has a client, use it; otherwise create one
    if (org.clients.length > 0) {
      return { orgId: org.id, clientId: org.clients[0].id };
    }
    const client = await db.client.create({
      data: {
        name: "Default",
        orgId: org.id,
      },
    });
    return { orgId: org.id, clientId: client.id };
  }

  // No org exists — create org, membership, and client in a transaction
  const result = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: "My Workspace" },
    });

    await tx.orgMembership.create({
      data: {
        userId,
        orgId: org.id,
        role: "owner",
      },
    });

    const client = await tx.client.create({
      data: {
        name: "Default",
        orgId: org.id,
      },
    });

    return { orgId: org.id, clientId: client.id };
  });

  return result;
}
