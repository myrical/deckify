"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdAccountInfo {
  id: string;
  platform: string;
  name: string;
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

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const json = await res.json();
        setClients(json.clients ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const createClient = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setNewName("");
        setShowForm(false);
        fetchClients();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Clients</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage clients and view their analytics.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent-primary)" }}
        >
          + Create Client
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div
          className="mb-5 rounded-lg px-4 py-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Client name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createClient()}
              autoFocus
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={createClient}
              disabled={creating || !newName.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{
                background: "var(--accent-primary)",
                opacity: creating || !newName.trim() ? 0.5 : 1,
              }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); }}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
      ) : clients.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <p className="mb-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
            No clients yet.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium"
            style={{ color: "var(--accent-primary)" }}
          >
            Create your first client
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {clients.map((client) => {
            const platformCounts = new Map<string, number>();
            for (const acc of client.adAccounts) {
              platformCounts.set(acc.platform, (platformCounts.get(acc.platform) ?? 0) + 1);
            }

            return (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="block rounded-xl p-5 transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {client.name}
                  </h3>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {client.adAccounts.length} data source{client.adAccounts.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {client.adAccounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {[...platformCounts.entries()].map(([platform, count]) => (
                      <span
                        key={platform}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          background: `${PLATFORM_COLORS[platform] ?? "#666"}18`,
                          color: PLATFORM_COLORS[platform] ?? "var(--text-secondary)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: PLATFORM_COLORS[platform] ?? "#666" }}
                        />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}: {count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    No data sources assigned yet
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
