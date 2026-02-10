"use client";

import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PlatformId = "meta" | "google" | "shopify";

interface PlatformConnection {
  platform: PlatformId;
  connected: boolean;
  accountName?: string;
  accountId?: string;
}

interface ConnectionsResponse {
  connections: PlatformConnection[];
}

/* ------------------------------------------------------------------ */
/*  Platform metadata                                                  */
/* ------------------------------------------------------------------ */

const PLATFORMS: Array<{
  id: PlatformId;
  label: string;
  description: string;
  brandColor: string;
  authUrl: string;
  icon: React.ReactNode;
}> = [
  {
    id: "meta",
    label: "Meta Ads",
    description: "Facebook & Instagram advertising",
    brandColor: "#1877F2",
    authUrl: "/api/meta/auth?clientId=default",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z" />
      </svg>
    ),
  },
  {
    id: "google",
    label: "Google Ads",
    description: "Search, Display & YouTube advertising",
    brandColor: "#4285F4",
    authUrl: "/api/google/auth?clientId=default",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
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
    description: "E-commerce store data & analytics",
    brandColor: "#96BF48",
    authUrl: "/api/shopify/auth?clientId=default",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M15.34 2.61a.26.26 0 0 0-.24-.21 2.2 2.2 0 0 0-.49 0s-1 .3-1.36.4a4 4 0 0 0-.27-.69A2 2 0 0 0 11.24 1c-.09 0-.69 0-1.34.86a5 5 0 0 0-.81 2.38l-1.56.48a.85.85 0 0 0-.54.56c-.06.18-1.41 10.86-1.41 10.86L11.73 17l6-1.3s-2.36-12.92-2.39-13.09ZM11.5 5l-1.18.37a4 4 0 0 1 .61-1.59c.37-.44.73-.58.95-.63A4 4 0 0 0 11.5 5Zm-1.67.52-.01.01a5 5 0 0 1 .77-2.3.79.79 0 0 1 .31-.27 2 2 0 0 0-.47.36A5.1 5.1 0 0 0 9.5 5.5l.34-.1.01.01Zm1.32-2.87c.15 0 .3.05.44.16a.87.87 0 0 0-.44.26 4.7 4.7 0 0 0-.87 2.19l-1 .31a4.2 4.2 0 0 1 1-2.49c.26-.28.56-.43.87-.43Z" />
        <path d="m17.55 15.63-6 1.3.85 4.14 5.42-1.17-.27-4.27Z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Checkmark icon                                                     */
/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      width="16"
      height="16"
      style={{ color: "var(--status-positive)" }}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Link / external icon                                               */
/* ------------------------------------------------------------------ */

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      width="16"
      height="16"
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.25-.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.31l-5.47 5.47a.75.75 0 1 1-1.06-1.06l5.47-5.47H12.25a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ConnectAccounts() {
  const [connections, setConnections] = useState<PlatformConnection[]>(
    PLATFORMS.map((p) => ({ platform: p.id, connected: false }))
  );
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState("");
  const [shopError, setShopError] = useState("");
  const [disconnecting, setDisconnecting] = useState<PlatformId | null>(null);
  const [connecting, setConnecting] = useState<PlatformId | null>(null);
  const [syncing, setSyncing] = useState<PlatformId | null>(null);
  const [syncResult, setSyncResult] = useState<{ platform: PlatformId; synced: number; newAccounts: number } | null>(null);
  const [connectError, setConnectError] = useState<{ platform: PlatformId; message: string } | null>(null);

  /* Fetch connection status on mount -------------------------------- */
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data: ConnectionsResponse = await res.json();
        setConnections(
          PLATFORMS.map((p) => {
            const match = data.connections.find((c) => c.platform === p.id);
            return match ?? { platform: p.id, connected: false };
          })
        );
      }
    } catch {
      // API may not exist yet -- treat as all disconnected
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  /* Derived state --------------------------------------------------- */
  const connectedCount = connections.filter((c) => c.connected).length;

  /* Handlers -------------------------------------------------------- */
  const handleConnect = async (platformId: PlatformId) => {
    setConnectError(null);
    setConnecting(platformId);

    let authUrl: string;
    if (platformId === "shopify") {
      const domain = shopDomain.trim();
      if (!domain) {
        setShopError("Please enter your Shopify store domain");
        setConnecting(null);
        return;
      }
      if (!domain.includes(".myshopify.com")) {
        setShopError("Domain must end with .myshopify.com");
        setConnecting(null);
        return;
      }
      setShopError("");
      authUrl = `/api/shopify/auth?clientId=default&shop=${encodeURIComponent(domain)}`;
    } else {
      const platform = PLATFORMS.find((p) => p.id === platformId);
      if (!platform) return;
      authUrl = platform.authUrl;
    }

    try {
      const res = await fetch(authUrl, { redirect: "manual" });
      if (res.status === 501) {
        const data = await res.json();
        setConnectError({ platform: platformId, message: data.error || "This platform is not configured yet." });
        setConnecting(null);
        return;
      }
      if (res.status === 400) {
        const data = await res.json();
        setConnectError({ platform: platformId, message: data.error });
        setConnecting(null);
        return;
      }
      // Successful redirect — follow it
      const location = res.headers.get("location");
      if (location) {
        window.location.href = location;
      } else {
        // Fallback: navigate directly
        window.location.href = authUrl;
      }
    } catch {
      setConnectError({ platform: platformId, message: "Failed to connect. Please try again." });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: PlatformId) => {
    setDisconnecting(platformId);
    try {
      const res = await fetch(`/api/connections/${platformId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) =>
            c.platform === platformId
              ? { platform: platformId, connected: false }
              : c
          )
        );
        setSyncResult(null);
      }
    } catch {
      // silently fail -- user can retry
    } finally {
      setDisconnecting(null);
    }
  };

  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async (platformId: PlatformId) => {
    setSyncing(platformId);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch(`/api/connections/${platformId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ platform: platformId, synced: data.synced, newAccounts: data.newAccounts });
      } else {
        setSyncError(data.error ?? `Sync failed (${res.status})`);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync request failed");
    } finally {
      setSyncing(null);
    }
  };

  /* Loading skeleton ------------------------------------------------ */
  if (loading) {
    return (
      <section className="animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <section className="animate-fade-in">
      {/* Section header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Connect Accounts
          </h2>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            {connectedCount === 0
              ? "Link your ad platforms to start pulling data"
              : `${connectedCount} of ${PLATFORMS.length} platforms connected`}
          </p>
        </div>

        {/* Connection progress indicator */}
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1"
          style={{
            background:
              connectedCount === PLATFORMS.length
                ? "var(--status-positive-light)"
                : "var(--bg-tertiary)",
          }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background:
                connectedCount === PLATFORMS.length
                  ? "var(--status-positive)"
                  : "var(--text-tertiary)",
            }}
          />
          <span
            className="text-xs font-medium"
            style={{
              color:
                connectedCount === PLATFORMS.length
                  ? "var(--status-positive)"
                  : "var(--text-tertiary)",
            }}
          >
            {connectedCount}/{PLATFORMS.length}
          </span>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLATFORMS.map((platform, idx) => {
          const conn = connections.find((c) => c.platform === platform.id);
          const isConnected = conn?.connected ?? false;

          return (
            <div
              key={platform.id}
              className="animate-fade-in group relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${isConnected ? "var(--status-positive)" : "var(--border-primary)"}`,
                boxShadow: isConnected
                  ? "var(--shadow-md)"
                  : "var(--shadow-sm)",
                animationDelay: `${idx * 80}ms`,
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-1 transition-opacity"
                style={{
                  background: isConnected
                    ? "var(--status-positive)"
                    : platform.brandColor,
                  opacity: isConnected ? 1 : 0.6,
                }}
              />

              {/* Header row: icon + status */}
              <div className="flex items-start justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{
                    background: `${platform.brandColor}18`,
                    color: platform.brandColor,
                  }}
                >
                  {platform.icon}
                </div>

                {isConnected && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{
                      background: "var(--status-positive-light)",
                    }}
                  >
                    <CheckIcon />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--status-positive)" }}
                    >
                      Connected
                    </span>
                  </div>
                )}
              </div>

              {/* Platform name + description */}
              <h3
                className="mt-3 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {platform.label}
              </h3>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                {platform.description}
              </p>

              {/* Connected state */}
              {isConnected && (
                <div className="mt-3">
                  {conn?.accountName && (
                    <p
                      className="mb-2 truncate text-xs font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {conn.accountName}
                    </p>
                  )}
                  {syncResult?.platform === platform.id && (
                    <p
                      className="mb-2 text-xs font-medium"
                      style={{ color: "var(--status-positive)" }}
                    >
                      {syncResult.newAccounts > 0
                        ? `Found ${syncResult.newAccounts} new account${syncResult.newAccounts === 1 ? "" : "s"} (${syncResult.synced} total)`
                        : `All ${syncResult.synced} accounts up to date`}
                    </p>
                  )}
                  {syncError && (
                    <p
                      className="mb-2 text-xs font-medium"
                      style={{ color: "var(--status-negative)" }}
                    >
                      {syncError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(platform.id)}
                      disabled={syncing === platform.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: platform.brandColor,
                        color: "#ffffff",
                        cursor: syncing === platform.id ? "not-allowed" : "pointer",
                        opacity: syncing === platform.id ? 0.7 : 1,
                      }}
                    >
                      {syncing === platform.id ? "Syncing..." : "Sync Accounts"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(platform.id)}
                      disabled={disconnecting === platform.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-secondary)",
                        cursor:
                          disconnecting === platform.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: disconnecting === platform.id ? 0.6 : 1,
                      }}
                    >
                      {disconnecting === platform.id
                        ? "Disconnecting..."
                        : "Disconnect"}
                    </button>
                  </div>
                </div>
              )}

              {/* Disconnected state */}
              {!isConnected && (
                <div className="mt-3">
                  {/* Shopify needs a shop domain input */}
                  {platform.id === "shopify" && (
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder="your-store.myshopify.com"
                        value={shopDomain}
                        onChange={(e) => {
                          setShopDomain(e.target.value);
                          if (shopError) setShopError("");
                        }}
                        className="w-full rounded-lg px-3 py-1.5 text-xs outline-none transition-all focus:ring-1"
                        style={{
                          background: "var(--bg-secondary)",
                          border: shopError
                            ? "1px solid var(--status-negative, #ef4444)"
                            : "1px solid var(--border-primary)",
                          color: "var(--text-primary)",
                          // @ts-expect-error -- CSS custom property for focus ring
                          "--tw-ring-color": platform.brandColor,
                        }}
                      />
                      {shopError && (
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "var(--status-negative, #ef4444)" }}
                        >
                          {shopError}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 hover:shadow-md"
                    style={{
                      background: platform.brandColor,
                      color: "#ffffff",
                      opacity: connecting === platform.id ? 0.7 : 1,
                      cursor: connecting === platform.id ? "not-allowed" : "pointer",
                    }}
                  >
                    <LinkIcon />
                    {connecting === platform.id ? "Connecting..." : `Connect ${platform.label}`}
                  </button>
                  {connectError?.platform === platform.id && (
                    <p className="mt-2 text-xs" style={{ color: "var(--status-negative, #ef4444)" }}>
                      {connectError.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
