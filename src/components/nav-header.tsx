"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="glass-card sticky top-0 z-50 border-b border-[var(--border-primary)] !rounded-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Prism</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard" active={pathname === "/dashboard"}>Dashboard</NavLink>
          <NavLink href="/generate" active={pathname === "/generate"}>New Deck</NavLink>
          <div className="mx-2 h-5 w-px" style={{ background: "var(--border-primary)" }} />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-all"
      style={{
        color: active ? "var(--accent-primary)" : "var(--text-secondary)",
        background: active ? "var(--accent-primary-light)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}
