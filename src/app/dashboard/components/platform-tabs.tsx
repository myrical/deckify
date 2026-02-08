"use client";

import { cn } from "@/lib/cn";

export type PlatformView = "aggregate" | "meta" | "google" | "shopify";

interface PlatformTabsProps {
  active: PlatformView;
  onTabChange: (view: PlatformView) => void;
  connectedPlatforms: PlatformView[];
}

const TABS: Array<{ id: PlatformView; label: string; icon: React.ReactNode }> = [
  {
    id: "aggregate",
    label: "All Platforms",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.5v.5h4v-.5c0-1.057.763-2 1.815-2.869A6 6 0 0 0 10 1Zm-1 15h2v1a1 1 0 1 1-2 0v-1Z" />
      </svg>
    ),
  },
  {
    id: "meta",
    label: "Meta Ads",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z" />
      </svg>
    ),
  },
  {
    id: "google",
    label: "Google Ads",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path d="M5.84 14.09A6.9 6.9 0 0 1 5.84 9.91V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
      </svg>
    ),
  },
  {
    id: "shopify",
    label: "Shopify",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M15.34 2.61a.26.26 0 0 0-.24-.21 2.2 2.2 0 0 0-.49 0s-1 .3-1.36.4a4 4 0 0 0-.27-.69A2 2 0 0 0 11.24 1c-.09 0-.69 0-1.34.86a5 5 0 0 0-.81 2.38l-1.56.48a.85.85 0 0 0-.54.56c-.06.18-1.41 10.86-1.41 10.86L11.73 17l6-1.3s-2.36-12.92-2.39-13.09ZM11.5 5l-1.18.37a4 4 0 0 1 .61-1.59c.37-.44.73-.58.95-.63A4 4 0 0 0 11.5 5Zm-1.67.52-.01.01a5 5 0 0 1 .77-2.3.79.79 0 0 1 .31-.27 2 2 0 0 0-.47.36A5.1 5.1 0 0 0 9.5 5.5l.34-.1.01.01Zm1.32-2.87c.15 0 .3.05.44.16a.87.87 0 0 0-.44.26 4.7 4.7 0 0 0-.87 2.19l-1 .31a4.2 4.2 0 0 1 1-2.49c.26-.28.56-.43.87-.43Z" />
        <path d="m17.55 15.63-6 1.3.85 4.14 5.42-1.17-.27-4.27Z" />
      </svg>
    ),
  },
];

export function PlatformTabs({ active, onTabChange, connectedPlatforms }: PlatformTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {TABS.map((tab) => {
        const isConnected = tab.id === "aggregate" || connectedPlatforms.includes(tab.id);
        return (
          <button
            key={tab.id}
            onClick={() => isConnected && onTabChange(tab.id)}
            disabled={!isConnected}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active === tab.id
                ? "bg-gray-900 text-white"
                : isConnected
                  ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  : "cursor-not-allowed text-gray-300"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
