/**
 * Ensure Organization Helper
 *
 * When a user connects a platform for the first time, auto-create:
 * 1. Organization (if user doesn't have one) named "My Workspace"
 * 2. OrgMembership linking user as "owner"
 *
 * Clients are NOT auto-created — users organize accounts into clients manually.
 */

import { db } from "@/lib/db";

export async function ensureOrg(userId: string): Promise<string> {
  // Check if user already has an org membership
  const existingMembership = await db.orgMembership.findFirst({
    where: { userId },
  });

  if (existingMembership) {
    return existingMembership.orgId;
  }

  // No org exists — create org + membership in a transaction
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

    return org.id;
  });

  return result;
}
