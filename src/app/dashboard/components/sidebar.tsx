"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  connectionCount: number;
  unassignedCount: number;
  connectedPlatforms: string[];
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  platform?: string;
  badge?: "unassigned" | "connections";
}

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  { section: "Analytics", items: [
    { href: "/dashboard/clients", label: "Clients", icon: "users" },
  ]},
  { section: "Manage", items: [
    { href: "/dashboard/data-sources", label: "Data Sources", icon: "database", badge: "unassigned" },
    { href: "/dashboard/connections", label: "Connections", icon: "plug", badge: "connections" },
  ]},
];

function SidebarIcon({ type, color }: { type: string; color?: string }) {
  const c = color ?? "currentColor";
  switch (type) {
    case "chart": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13A1.5 1.5 0 0 0 15.5 18h1A1.5 1.5 0 0 0 18 16.5v-13A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9A1.5 1.5 0 0 0 9.5 18h1A1.5 1.5 0 0 0 12 16.5v-9A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5A1.5 1.5 0 0 0 3.5 18h1A1.5 1.5 0 0 0 6 16.5v-5A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>;
    case "meta": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.75a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" /></svg>;
    case "google": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" /></svg>;
    case "shopify": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" /></svg>;
    case "users": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" /></svg>;
    case "database": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path fillRule="evenodd" d="M10 1c-1.716 0-3.408.106-5.07.31C3.806 1.45 3 2.414 3 3.517V16.483c0 1.103.806 2.068 1.93 2.207 1.662.205 3.354.31 5.07.31 1.716 0 3.408-.105 5.07-.31 1.124-.14 1.93-1.104 1.93-2.207V3.517c0-1.103-.806-2.068-1.93-2.207A48.149 48.149 0 0 0 10 1ZM5.5 4.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H10a.75.75 0 0 0 0-1.5H6.25Z" clipRule="evenodd" /></svg>;
    case "plug": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /></svg>;
    case "deck": return <svg viewBox="0 0 20 20" fill={c} width="18" height="18"><path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" /></svg>;
    default: return null;
  }
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

export function Sidebar({ connectionCount, unassignedCount, connectedPlatforms }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r" style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Prism</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((section) => (
          <div key={section.section} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              {section.section}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const isConnected = !item.platform || connectedPlatforms.includes(item.platform);
              const platformColor = item.platform ? PLATFORM_COLORS[item.platform] : undefined;

              let badge: React.ReactNode = null;
              if (item.badge === "unassigned" && unassignedCount > 0) {
                badge = (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "var(--status-warning, #f59e0b)", color: "#fff" }}>
                    {unassignedCount}
                  </span>
                );
              } else if (item.badge === "connections") {
                badge = (
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    {connectionCount}/3
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-all ${!isActive ? "btn-nav" : ""}`}
                  style={{
                    color: isActive
                      ? "var(--accent-primary)"
                      : isConnected
                        ? "var(--text-secondary)"
                        : "var(--text-tertiary)",
                    background: isActive ? "var(--accent-primary-light)" : "transparent",
                    opacity: isConnected ? 1 : 0.5,
                  }}
                >
                  <span style={{ color: isActive ? "var(--accent-primary)" : platformColor }}>
                    <SidebarIcon type={item.icon} color={isActive ? "var(--accent-primary)" : platformColor} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.platform && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: isConnected ? "var(--status-positive)" : "var(--text-tertiary)" }} />
                  )}
                  {badge}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: New Deck + theme toggle */}
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--border-primary)" }}>
        <Link
          href="/generate"
          className="btn-solid mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}
        >
          <SidebarIcon type="deck" color="#fff" />
          New Deck
        </Link>
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
