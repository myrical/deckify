"use client";

import { useState } from "react";
import { NavHeader } from "@/components/nav-header";
import { PlatformTabs, type PlatformView } from "./components/platform-tabs";
import { AggregateView } from "./components/aggregate-view";
import { MetaView } from "./components/meta-view";
import { GoogleView } from "./components/google-view";
import { ShopifyView } from "./components/shopify-view";
import { ConnectAccounts } from "./components/connect-accounts";
import { DataSources } from "./components/data-sources";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<PlatformView>("aggregate");

  // TODO: replace with real data from API / server component
  const connectedPlatforms: PlatformView[] = ["meta", "google", "shopify"];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <NavHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Step 1: Connect Platforms */}
        <div className="mb-8">
          <ConnectAccounts />
        </div>

        {/* Step 2: Data Sources — discovered accounts with client assignment */}
        <div className="mb-8">
          <DataSources />
        </div>

        {/* Analytics Section */}
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

        <div key={activeView} className="animate-fade-in">
          {activeView === "aggregate" && <AggregateView />}
          {activeView === "meta" && <MetaView />}
          {activeView === "google" && <GoogleView />}
          {activeView === "shopify" && <ShopifyView />}
        </div>
      </main>
    </div>
  );
}
