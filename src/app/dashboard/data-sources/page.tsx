"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type StatusFilter = "unassigned" | "assigned" | "all";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  shopify: "#96BF48",
};

const PLATFORMS = ["all", "meta", "google", "shopify"] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DataSourcesPage() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const accountsParam = searchParams.get("accounts");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unassigned");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Error toast for channel limit enforcement
  const [assignError, setAssignError] = useState<string | null>(null);

  // Data
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline client creation
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Banner
  const [showBanner, setShowBanner] = useState(!!successParam);

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        platform: platformFilter,
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/data-sources?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDataSources(json.dataSources);
        setClients(json.clients);
        setTotal(json.total);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, platformFilter, statusFilter, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear selection when filters change
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, platformFilter, statusFilter, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Handlers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === dataSources.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dataSources.map((d) => d.id)));
    }
  };

  const assignSingle = async (dataSourceId: string, clientId: string | null) => {
    setAssignError(null);
    const res = await fetch("/api/data-sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataSourceId, clientId }),
    });
    if (res.status === 409) {
      const json = await res.json();
      setAssignError(json.error ?? "This client already has an account on this platform.");
    }
    fetchData();
  };

  const assignBulk = async (clientId: string | null) => {
    if (selected.size === 0) return;
    setAssignError(null);
    const res = await fetch("/api/data-sources/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataSourceIds: [...selected], clientId }),
    });
    if (res.status === 409) {
      const json = await res.json();
      setAssignError(json.error ?? "Channel limit reached for this client.");
    }
    setSelected(new Set());
    fetchData();
  };

  const createClient = async () => {
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
        const json = await res.json();
        setClients((prev) => [...prev, { id: json.client.id, name: json.client.name }]);
        setNewClientName("");
      }
    } catch {
      // silent
    } finally {
      setCreatingClient(false);
    }
  };

  const bannerText = useMemo(() => {
    if (!successParam) return null;
    const platform = successParam.replace("_connected", "");
    const name = platform.charAt(0).toUpperCase() + platform.slice(1);
    return `${name} connected${accountsParam ? ` — ${accountsParam} accounts discovered` : ""}. Assign accounts to a client to start seeing analytics.`;
  }, [successParam, accountsParam]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Data Sources</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Search and assign your ad accounts to clients.
        </p>
      </div>

      {/* Post-OAuth banner */}
      {showBanner && bannerText && (
        <div
          className="mb-5 flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: "var(--status-positive-light)", border: "1px solid var(--status-positive)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--status-positive)" }}>
            {bannerText}
          </p>
          <button
            onClick={() => setShowBanner(false)}
            className="text-sm font-medium"
            style={{ color: "var(--status-positive)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search by name or account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg px-3 py-2 pl-9 text-sm outline-none"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)",
            }}
          />
          <svg
            viewBox="0 0 20 20"
            fill="var(--text-tertiary)"
            width="16"
            height="16"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Platform pills */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => { setPlatformFilter(p); setPage(1); }}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: platformFilter === p ? "var(--bg-card)" : "transparent",
                color: platformFilter === p
                  ? (p === "all" ? "var(--text-primary)" : PLATFORM_COLORS[p])
                  : "var(--text-tertiary)",
                boxShadow: platformFilter === p ? "var(--shadow-sm)" : "none",
              }}
            >
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Status toggle */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
          {(["unassigned", "assigned", "all"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: statusFilter === s ? "var(--bg-card)" : "transparent",
                color: statusFilter === s ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: statusFilter === s ? "var(--shadow-sm)" : "none",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Inline client creation */}
      {clients.length === 0 && (
        <div
          className="mb-4 rounded-lg px-4 py-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <p className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Create a client first to start assigning data sources
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Client name..."
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createClient()}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={createClient}
              disabled={creatingClient || !newClientName.trim()}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-white"
              style={{
                background: "var(--accent-primary)",
                opacity: creatingClient || !newClientName.trim() ? 0.5 : 1,
              }}
            >
              Create Client
            </button>
          </div>
        </div>
      )}

      {/* Assign error toast */}
      {assignError && (
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: "var(--status-negative-light, #fef2f2)", border: "1px solid var(--status-negative, #ef4444)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--status-negative, #ef4444)" }}>
            {assignError}
          </p>
          <button
            onClick={() => setAssignError(null)}
            className="text-sm font-medium"
            style={{ color: "var(--status-negative, #ef4444)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results info */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {loading ? "Loading..." : total > 0
            ? `Showing ${(page - 1) * limit + 1}\u2013${Math.min(page * limit, total)} of ${total} data source${total !== 1 ? "s" : ""}`
            : `${total} data source${total !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-md px-1.5 py-1 text-xs outline-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            >
              {[25, 50, 100, 250, 500].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {total > 0 && (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Page {page} of {totalPages}
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border-primary)" }}
      >
        {/* Table header */}
        <div
          className="grid items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: "32px 1fr 140px 160px",
            background: "var(--bg-secondary)",
            color: "var(--text-tertiary)",
          }}
        >
          <div>
            <input
              type="checkbox"
              checked={dataSources.length > 0 && selected.size === dataSources.length}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 rounded"
            />
          </div>
          <div>Account</div>
          <div>Platform</div>
          <div>Assign to</div>
        </div>

        {/* Rows */}
        {loading && dataSources.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>
          </div>
        ) : dataSources.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {statusFilter === "unassigned"
                ? "No unassigned data sources."
                : "No data sources found."}
            </p>
            {statusFilter === "unassigned" && (
              <Link
                href="/dashboard/connections"
                className="mt-2 inline-block text-sm font-medium"
                style={{ color: "var(--accent-primary)" }}
              >
                Connect a platform to discover accounts
              </Link>
            )}
          </div>
        ) : (
          dataSources.map((ds) => (
            <div
              key={ds.id}
              className="grid items-center gap-3 border-t px-4 py-3 transition-colors"
              style={{
                gridTemplateColumns: "32px 1fr 140px 160px",
                borderColor: "var(--border-primary)",
                background: selected.has(ds.id) ? "var(--accent-primary-light)" : "var(--bg-card)",
              }}
            >
              {/* Checkbox */}
              <div>
                <input
                  type="checkbox"
                  checked={selected.has(ds.id)}
                  onChange={() => toggleSelect(ds.id)}
                  className="h-3.5 w-3.5 rounded"
                />
              </div>

              {/* Account info */}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {ds.name}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {ds.platformId}
                </p>
              </div>

              {/* Platform badge */}
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: `${PLATFORM_COLORS[ds.platform] ?? "#666"}18`,
                    color: PLATFORM_COLORS[ds.platform] ?? "var(--text-secondary)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PLATFORM_COLORS[ds.platform] ?? "#666" }}
                  />
                  {ds.platform.charAt(0).toUpperCase() + ds.platform.slice(1)}
                </span>
              </div>

              {/* Assign dropdown */}
              <div>
                <select
                  value={ds.clientId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    assignSingle(ds.id, val || null);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    color: ds.clientId ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  <option value="">Unassigned</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              color: page === 1 ? "var(--text-tertiary)" : "var(--text-primary)",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              color: page === totalPages ? "var(--text-tertiary)" : "var(--text-primary)",
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl px-5 py-3 shadow-lg"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {selected.size} selected
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                assignBulk(e.target.value);
                e.target.value = "";
              }
            }}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{
              background: "var(--accent-primary)",
              color: "#fff",
              border: "none",
            }}
          >
            <option value="" disabled>Assign to...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
