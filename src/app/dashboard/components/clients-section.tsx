"use client";

import { useCallback, useEffect, useState } from "react";

interface AdAccountInfo {
  id: string;
  platform: string;
  platformId: string;
  name: string;
  status: string;
  connected: boolean;
}

interface ClientInfo {
  id: string;
  name: string;
  createdAt: string;
  adAccounts: AdAccountInfo[];
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

export function ClientsSection() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Please enter a client name");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setClients((prev) => [...prev, data.client]);
        setNewName("");
        setShowForm(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create client");
      }
    } catch {
      setError("Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <section
        className="rounded-xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
      >
        <div className="h-32 animate-pulse rounded-lg" style={{ background: "var(--bg-secondary)" }} />
      </section>
    );
  }

  return (
    <section
      className="rounded-xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Clients
        </h2>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
          style={{
            background: "var(--accent-primary-light)",
            color: "var(--accent-primary)",
          }}
        >
          + Add Client
        </button>
      </div>

      {/* Add client form */}
      {showForm && (
        <div
          className="mb-4 rounded-lg p-4"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Client name"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-card)",
                border: error ? "1px solid var(--status-negative, #ef4444)" : "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: "var(--accent-primary)",
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); setError(""); }}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs" style={{ color: "var(--status-negative, #ef4444)" }}>{error}</p>
          )}
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg py-8"
          style={{ background: "var(--bg-secondary)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No clients yet. Add a client to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-lg p-4 transition-all hover:-translate-y-0.5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {client.name}
                </h3>
                {client.adAccounts.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {client.adAccounts.length} account{client.adAccounts.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {client.adAccounts.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {client.adAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                      style={{ background: `${PLATFORM_COLORS[acc.platform] ?? "#888"}15` }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: acc.connected ? "var(--status-positive)" : "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: PLATFORM_COLORS[acc.platform] ?? "var(--text-secondary)" }}
                      >
                        {acc.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  No ad accounts connected
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
