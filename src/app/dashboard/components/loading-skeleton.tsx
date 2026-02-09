"use client";

interface AnalyticsSkeletonProps {
  variant?: "meta" | "google" | "shopify" | "overview";
}

function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`shimmer rounded-xl ${className ?? ""}`}
      style={{
        background: "linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}

function MetricCardSkeleton({ large }: { large?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-xl p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <ShimmerBlock style={{ height: 12, width: "60%", marginBottom: 8 }} />
      <ShimmerBlock style={{ height: large ? 32 : 24, width: "80%", marginBottom: large ? 8 : 0 }} />
      {large && <ShimmerBlock style={{ height: 14, width: "40%", marginTop: 8 }} />}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <ShimmerBlock style={{ height: 14, width: 160, marginBottom: 16 }} />
      <ShimmerBlock style={{ height: 280, width: "100%", borderRadius: 12 }} />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <ShimmerBlock style={{ height: 14, width: 120 }} />
      </div>
      <div className="px-6 py-3" style={{ background: "var(--bg-secondary)" }}>
        <div className="flex gap-8">
          {[100, 60, 60, 60, 60, 60].map((w, i) => (
            <ShimmerBlock key={i} style={{ height: 10, width: w }} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-8 px-6 py-3"
          style={{ borderBottom: "1px solid var(--border-secondary)" }}
        >
          <ShimmerBlock style={{ height: 14, width: 140 }} />
          <ShimmerBlock style={{ height: 14, width: 60 }} />
          <ShimmerBlock style={{ height: 14, width: 60 }} />
          <ShimmerBlock style={{ height: 14, width: 60 }} />
          <ShimmerBlock style={{ height: 14, width: 60 }} />
          <ShimmerBlock style={{ height: 14, width: 60 }} />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton({ variant = "meta" }: AnalyticsSkeletonProps) {
  const primaryCols = variant === "shopify" ? 6 : 4;
  const secondaryCols = variant === "shopify" ? 0 : 4;

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className={`grid grid-cols-2 gap-4 ${primaryCols === 6 ? "lg:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-4"}`}>
        {Array.from({ length: primaryCols }).map((_, i) => (
          <MetricCardSkeleton key={`p-${i}`} large />
        ))}
      </div>

      {/* Secondary KPIs */}
      {secondaryCols > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: secondaryCols }).map((_, i) => (
            <MetricCardSkeleton key={`s-${i}`} />
          ))}
        </div>
      )}

      {/* Charts */}
      {variant !== "overview" && (
        <div className={variant === "shopify" ? "" : "grid grid-cols-1 gap-6 lg:grid-cols-2"}>
          <ChartSkeleton />
          {variant !== "shopify" && <ChartSkeleton />}
        </div>
      )}

      {/* Table */}
      <TableSkeleton />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl p-5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <ShimmerBlock style={{ height: 18, width: 140 }} />
            <ShimmerBlock style={{ height: 14, width: 80 }} />
          </div>
          <div className="flex gap-6 mb-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex-1">
                <ShimmerBlock style={{ height: 10, width: "70%", marginBottom: 6 }} />
                <ShimmerBlock style={{ height: 28, width: "90%" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <ShimmerBlock style={{ height: 26, width: 100, borderRadius: 999 }} />
            <ShimmerBlock style={{ height: 26, width: 100, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ShimmerBlock style={{ height: 28, width: 200 }} />
        <ShimmerBlock style={{ height: 36, width: 120, borderRadius: 8 }} />
      </div>
      <div className="flex gap-2">
        <ShimmerBlock style={{ height: 36, width: 80, borderRadius: 8 }} />
        <ShimmerBlock style={{ height: 36, width: 80, borderRadius: 8 }} />
        <ShimmerBlock style={{ height: 36, width: 80, borderRadius: 8 }} />
      </div>
      <AnalyticsSkeleton variant="meta" />
    </div>
  );
}
