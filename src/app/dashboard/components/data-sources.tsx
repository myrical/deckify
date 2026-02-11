"use client";

import { useCallback, useEffect, useState } from "react";

interface DataSource {
  id: string;
  platform: string;
  platformId: string;
  name: string;
  status: string;
  isActive: boolean;
  clientId: string | null;
  clientName: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  shopify: "Shopify",
};

export function DataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data-sources");
      if (res.ok) {
        const data = await res.json();
        setDataSources(data.dataSources);
        setClients(data.clients);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (dataSourceId: string, clientId: string | null) => {
    setAssigning(dataSourceId);
    try {
      const res = await fetch("/api/data-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId, clientId }),
      });
      if (res.ok) {
        const clientName = clients.find((c) => c.id === clientId)?.name ?? null;
        setDataSources((prev) =>
          prev.map((ds) =>
            ds.id === dataSourceId ? { ...ds, clientId, clientName } : ds
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setAssigning(null);
    }
  };

  const handleCreateClient = async () => {
    const name = newClientName.trim();
    if (!name) return;
    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setClients((prev) => [...prev, { id: data.client.id, name: data.client.name }]);
        setNewClientName("");
      }
    } catch {
      // silently fail
    } finally {
      setCreatingClient(false);
    }
  };

  if (loading) {
    return (
      <section className="animate-fade-in">
        <div className="h-32 animate-pulse rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }} />
      </section>
    );
  }

  if (dataSources.length === 0) {
    return null; // Don't show section if no data sources discovered
  }

  const unassigned = dataSources.filter((ds) => !ds.clientId);
  const assigned = dataSources.filter((ds) => ds.clientId);

  return (
    <section className="animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Data Sources
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {dataSources.length} discovered &middot; {assigned.length} assigned &middot; {unassigned.length} unassigned
          </p>
        </div>
      </div>

      {/* Unassigned data sources — needs attention */}
      {unassigned.length > 0 && (
        <div className="mb-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: "var(--status-warning, #f59e0b)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Unassigned — assign to a client to use in reports
            </span>
          </div>

          {/* Quick client creation if no clients exist */}
          {clients.length === 0 && (
            <div className="mb-3 flex gap-2 rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <input
                type="text"
                placeholder="Enter client name (e.g. Acme Corp)"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateClient(); }}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
              />
              <button
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientName.trim()}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--accent-primary)", opacity: creatingClient ? 0.7 : 1 }}
              >
                {creatingClient ? "Creating..." : "Create Client"}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {unassigned.map((ds) => (
              <DataSourceRow
                key={ds.id}
                dataSource={ds}
                clients={clients}
                assigning={assigning === ds.id}
                onAssign={(clientId) => handleAssign(ds.id, clientId)}
                onCreateClient={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned data sources */}
      {assigned.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: "var(--status-positive)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Assigned to clients
            </span>
          </div>
          <div className="space-y-2">
            {assigned.map((ds) => (
              <DataSourceRow
                key={ds.id}
                dataSource={ds}
                clients={clients}
                assigning={assigning === ds.id}
                onAssign={(clientId) => handleAssign(ds.id, clientId)}
                onCreateClient={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DataSourceRow({
  dataSource,
  clients,
  assigning,
  onAssign,
}: {
  dataSource: DataSource;
  clients: ClientOption[];
  assigning: boolean;
  onAssign: (clientId: string | null) => void;
  onCreateClient: () => void;
}) {
  const color = PLATFORM_COLORS[dataSource.platform] ?? "#888";
  const label = PLATFORM_LABELS[dataSource.platform] ?? dataSource.platform;

  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-all"
      style={{ background: "var(--bg-secondary)", opacity: assigning ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-white"
          style={{ background: color }}
        >
          {label.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {dataSource.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {label} &middot; {dataSource.platformId}
          </p>
        </div>
      </div>

      <select
        value={dataSource.clientId ?? ""}
        onChange={(e) => onAssign(e.target.value || null)}
        disabled={assigning}
        className="rounded-lg px-3 py-1.5 text-xs font-medium outline-none"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          color: dataSource.clientId ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      >
        <option value="">Unassigned</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
