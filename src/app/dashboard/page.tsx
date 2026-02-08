"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Prism</h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/generate"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              New Deck
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Platform Tabs + Date Picker row */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PlatformTabs
            active={activeView}
            onTabChange={setActiveView}
            connectedPlatforms={connectedPlatforms}
          />
          <div className="flex items-center gap-3">
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <option>Last 7 days</option>
              <option>Last 14 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export
            </button>
          </div>
        </div>

        {/* Active View */}
        {activeView === "aggregate" && <AggregateView />}
        {activeView === "meta" && <MetaView />}
        {activeView === "google" && <GoogleView />}
        {activeView === "shopify" && <ShopifyView />}

        {/* Clients & Recent Decks (below the platform views) */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Add Client
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">
                No clients yet. Add a client to connect their ad accounts and
                start generating decks.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Recent Decks
            </h2>
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">
                No decks generated yet. Create your first deck to see it here.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
