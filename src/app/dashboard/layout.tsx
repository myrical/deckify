import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "./components/sidebar";

async function getSidebarData(userId: string) {
  const membership = await db.orgMembership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          platformAuths: {
            where: { status: "active" },
            select: { platform: true },
          },
          clients: {
            include: {
              adAccounts: {
                where: { isActive: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return { connectionCount: 0, unassignedCount: 0, connectedPlatforms: [] as string[] };
  }

  const org = membership.organization;
  const connectedPlatforms = [...new Set(org.platformAuths.map((p) => p.platform))];

  // Count unassigned ad accounts across all platform auths
  const unassignedCount = await db.adAccount.count({
    where: {
      platformAuth: { orgId: org.id, status: "active" },
      clientId: null,
    },
  });

  return {
    connectionCount: connectedPlatforms.length,
    unassignedCount,
    connectedPlatforms,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const sidebarData = session?.user?.id
    ? await getSidebarData(session.user.id)
    : { connectionCount: 0, unassignedCount: 0, connectedPlatforms: [] as string[] };

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar
        connectionCount={sidebarData.connectionCount}
        unassignedCount={sidebarData.unassignedCount}
        connectedPlatforms={sidebarData.connectedPlatforms}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
