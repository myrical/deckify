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
/*  AssignDropdown — custom dropdown with inline client creation        */
/* ------------------------------------------------------------------ */

function AssignDropdown({
  currentValue,
  currentLabel,
  clients,
  onAssign,
  onClientCreated,
  variant = "row",
}: {
  currentValue: string | null;
  currentLabel?: string;
  clients: ClientOption[];
  onAssign: (clientId: string | null) => void;
  onClientCreated: (newClient: ClientOption) => void;
  variant?: "row" | "bulk";
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when create mode opens
  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  // Compute fixed position for dropdown to escape overflow clipping
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownWidth = 208;
    const dropdownHeight = 260;
    // Bulk bar is at the bottom — always open upward
    const openUpward = variant === "bulk" ? true : spaceBelow < dropdownHeight;

    // Center dropdown on button for bulk variant, right-align for row variant
    let left: number;
    if (variant === "bulk") {
      left = rect.left + rect.width / 2 - dropdownWidth / 2;
    } else {
      left = rect.right - dropdownWidth;
    }
    if (left < 8) left = 8;
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = window.innerWidth - dropdownWidth - 8;
    }

    setDropdownStyle({
      position: "fixed",
      left,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      width: dropdownWidth,
      zIndex: 9999,
    });
  }, [open, variant]);

  const handleSelect = (clientId: string | null) => {
    onAssign(clientId);
    setOpen(false);
    setCreating(false);
    setNewName("");
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const json = await res.json();
        const newClient = { id: json.client.id, name: json.client.name };
        onClientCreated(newClient);
        onAssign(newClient.id);
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const displayLabel = currentLabel
    ?? clients.find((c) => c.id === currentValue)?.name
    ?? (variant === "bulk" ? "Assign to..." : "Unassigned");

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 50 : "auto" }}>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-1 rounded-lg text-left transition-all"
        style={variant === "bulk" ? {
          background: "var(--accent-primary)",
          color: "#fff",
          padding: "6px 12px",
          fontSize: "14px",
          fontWeight: 500,
          border: "none",
        } : {
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-primary)",
          color: currentValue ? "var(--text-primary)" : "var(--text-tertiary)",
          padding: "6px 8px",
          fontSize: "12px",
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" className="shrink-0 opacity-60">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="overflow-hidden rounded-lg"
          style={{
            ...dropdownStyle,
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Unassigned option */}
          {variant === "row" && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="flex w-full items-center px-3 py-2 text-xs transition-colors"
              style={{
                color: !currentValue ? "var(--accent-primary)" : "var(--text-tertiary)",
                background: !currentValue ? "var(--accent-primary-light)" : "transparent",
              }}
              onMouseEnter={(e) => { if (currentValue) e.currentTarget.style.background = "var(--bg-secondary)"; }}
              onMouseLeave={(e) => { if (currentValue) e.currentTarget.style.background = "transparent"; }}
            >
              Unassigned
            </button>
          )}

          {/* Client list */}
          {clients.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {variant === "row" && (
                <div style={{ height: 1, background: "var(--border-primary)" }} />
              )}
              {clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className="flex w-full items-center px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: currentValue === c.id ? "var(--accent-primary)" : "var(--text-primary)",
                    background: currentValue === c.id ? "var(--accent-primary-light)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (currentValue !== c.id) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                  onMouseLeave={(e) => { if (currentValue !== c.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Create new client */}
          <div style={{ height: 1, background: "var(--border-primary)" }} />
          {creating ? (
            <div className="p-2">
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Client name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || submitting}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white"
                  style={{
                    background: "var(--accent-primary)",
                    opacity: !newName.trim() || submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? "..." : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
              style={{ color: "var(--accent-primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Create new client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
    // After assigning, clear search so user sees remaining unassigned sources
    if (clientId && search) {
      setSearch("");
      setDebouncedSearch("");
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
    // After assigning, clear search so user sees remaining unassigned sources
    if (clientId && search) {
      setSearch("");
      setDebouncedSearch("");
    }
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
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Data Sources</h1>
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
            className="btn-text text-sm font-medium"
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
            className="w-full rounded-lg py-2 pl-9 pr-8 text-sm outline-none"
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
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Platform pills */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => { setPlatformFilter(p); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${platformFilter !== p ? "btn-ghost" : ""}`}
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
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${statusFilter !== s ? "btn-ghost" : ""}`}
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
            className="btn-text text-sm font-medium"
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
        className="rounded-xl border"
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
                className="btn-text mt-2 inline-block text-sm font-medium"
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
              <AssignDropdown
                currentValue={ds.clientId}
                clients={clients}
                onAssign={(clientId) => assignSingle(ds.id, clientId)}
                onClientCreated={(newClient) => {
                  setClients((prev) => [...prev, newClient]);
                }}
              />
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${page !== 1 ? "btn-ghost" : ""}`}
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${page !== totalPages ? "btn-ghost" : ""}`}
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
          <AssignDropdown
            currentValue={null}
            currentLabel="Assign to..."
            clients={clients}
            onAssign={(clientId) => { if (clientId) assignBulk(clientId); }}
            onClientCreated={(newClient) => {
              setClients((prev) => [...prev, newClient]);
              assignBulk(newClient.id);
            }}
            variant="bulk"
          />
          <button
            onClick={() => setSelected(new Set())}
            className="btn-text text-sm font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
