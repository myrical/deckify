"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-15 blur-3xl" style={{ background: "var(--accent-primary)" }} />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-scale">
        <div className="rounded-2xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-lg)" }}>
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}>
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Welcome to Prism</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Sign in with your Google account to get started. You&apos;ll connect your ad platforms after logging in.</p>
          </div>

          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02]" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
          <p className="mt-3 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>This is only for app login — not for connecting ad accounts.</p>
        </div>
      </div>
    </div>
  );
}
