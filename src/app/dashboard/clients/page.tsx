"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const renameClient = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchClients();
      }
    } catch {
      // silent
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeletingId(null);
        fetchClients();
      }
    } catch {
      // silent
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

      {/* Delete confirmation modal */}
      {deletingId && (() => {
        const c = clients.find((cl) => cl.id === deletingId);
        if (!c) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="mx-4 w-full max-w-sm rounded-xl p-6" style={{ background: "var(--bg-card)" }}>
              <h3 className="mb-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Delete {c.name}?
              </h3>
              <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                {c.adAccounts.length > 0
                  ? `${c.adAccounts.length} data source${c.adAccounts.length !== 1 ? "s" : ""} will be unassigned.`
                  : "This client has no data sources assigned."}
                {" "}This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClient(deletingId)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--status-negative)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

            const isEditing = editingId === client.id;

            return (
              <div
                key={client.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameClient(client.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => renameClient(client.id)}
                      autoFocus
                      className="rounded-md px-2 py-1 text-base font-semibold outline-none"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-primary)",
                        color: "var(--text-primary)",
                      }}
                    />
                  ) : (
                    <Link href={`/dashboard/clients/${client.id}`}>
                      <h3 className="text-base font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                        {client.name}
                      </h3>
                    </Link>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {client.adAccounts.length} data source{client.adAccounts.length !== 1 ? "s" : ""}
                    </span>
                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingId(client.id);
                        setEditName(client.name);
                      }}
                      className="rounded-md p-1 transition-colors hover:opacity-80"
                      style={{ color: "var(--text-tertiary)" }}
                      title="Rename"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeletingId(client.id);
                      }}
                      className="rounded-md p-1 transition-colors hover:opacity-80"
                      style={{ color: "var(--status-negative, #ef4444)" }}
                      title="Delete"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                <Link href={`/dashboard/clients/${client.id}`} className="block">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
