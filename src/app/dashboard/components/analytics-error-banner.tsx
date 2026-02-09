"use client";

import Link from "next/link";

interface AnalyticsError {
  accountId: string;
  accountName: string;
  error: string;
  code: string;
  recoveryAction: string;
}

interface Props {
  errors: AnalyticsError[];
  accountsFound: number | null;
  platform: string;
}

const ACTION_MAP: Record<string, { label: string; href: string }> = {
  reconnect: { label: "Reconnect", href: "/dashboard/connections" },
  select_account: { label: "Manage data sources", href: "/dashboard/data-sources" },
};

export function AnalyticsErrorBanner({ errors, accountsFound, platform }: Props) {
  if (errors.length === 0) return null;

  const allFailed = accountsFound !== null && accountsFound > 0 && errors.length >= accountsFound;
  const primaryError = errors[0];
  const action = ACTION_MAP[primaryError.recoveryAction];

  return (
    <div
      className="mb-4 rounded-xl p-4"
      style={{
        background: allFailed ? "var(--status-error-light, rgba(239,68,68,0.1))" : "var(--status-warning-light, rgba(245,158,11,0.1))",
        border: `1px solid ${allFailed ? "var(--status-error, #ef4444)" : "var(--status-warning, #f59e0b)"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-base">
          {allFailed ? "\u26A0" : "\u24D8"}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {allFailed
              ? `Failed to fetch ${platform} data`
              : `${errors.length} of ${accountsFound} ${platform} account${(accountsFound ?? 0) !== 1 ? "s" : ""} failed to load`}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {primaryError.error}
          </p>
          {errors.length > 1 && (
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              +{errors.length - 1} more error{errors.length - 1 !== 1 ? "s" : ""}
            </p>
          )}
          {action && (
            <Link
              href={action.href}
              className="mt-2 inline-block text-xs font-medium"
              style={{ color: "var(--accent-primary)" }}
            >
              {action.label} &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
