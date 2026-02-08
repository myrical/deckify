"use client";

import { useState } from "react";
import { NavHeader } from "@/components/nav-header";
import { PlatformTabs, type PlatformView } from "./components/platform-tabs";
import { AggregateView } from "./components/aggregate-view";
import { MetaView } from "./components/meta-view";
import { GoogleView } from "./components/google-view";
import { ShopifyView } from "./components/shopify-view";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<PlatformView>("aggregate");

  // TODO: replace with real data from API / server component
  const connectedPlatforms: PlatformView[] = ["meta", "google", "shopify"];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <NavHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Platform Tabs + Date Picker row */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <PlatformTabs
            active={activeView}
            onTabChange={setActiveView}
            connectedPlatforms={connectedPlatforms}
          />
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl px-4 py-2 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            >
              <option>Last 7 days</option>
              <option>Last 14 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
            <button
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
              }}
            >
              Export
            </button>
          </div>
        </div>

        {/* Active View with animation */}
        <div key={activeView} className="animate-fade-in">
          {activeView === "aggregate" && <AggregateView />}
          {activeView === "meta" && <MetaView />}
          {activeView === "google" && <GoogleView />}
          {activeView === "shopify" && <ShopifyView />}
        </div>

        {/* Clients & Recent Decks (below the platform views) */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <section
            className="rounded-xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Clients</h2>
              <button
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: "var(--accent-primary-light)",
                  color: "var(--accent-primary)",
                }}
              >
                + Add Client
              </button>
            </div>
            <div
              className="flex items-center justify-center rounded-lg py-8"
              style={{ background: "var(--bg-secondary)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                No clients yet. Add a client to get started.
              </p>
            </div>
          </section>

          <section
            className="rounded-xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent Decks
            </h2>
            <div
              className="flex items-center justify-center rounded-lg py-8"
              style={{ background: "var(--bg-secondary)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                No decks generated yet.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
