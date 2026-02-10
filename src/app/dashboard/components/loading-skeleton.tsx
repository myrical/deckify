"use client";

function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ ...style }} />;
}

function MetricCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-24" : size === "md" ? "h-20" : "h-16";
  return (
    <div className={`rounded-xl p-4 ${h}`} style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
      <ShimmerBlock className="mb-2 h-3 w-16" />
      <ShimmerBlock className={size === "sm" ? "h-5 w-20" : "h-7 w-24"} />
    </div>
  );
}

export function AnalyticsSkeleton({ variant = "meta" }: { variant?: "meta" | "google" | "shopify" | "overview" }) {
  if (variant === "overview") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <ShimmerBlock className="mb-4 h-4 w-40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} size="lg" />)}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
              <div className="mb-3 flex items-center justify-between">
                <ShimmerBlock className="h-5 w-32" />
                <ShimmerBlock className="h-4 w-20" />
              </div>
              <div className="flex gap-4">
                <ShimmerBlock className="h-10 w-20" />
                <ShimmerBlock className="h-10 w-20" />
                <ShimmerBlock className="h-10 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cols = variant === "shopify" ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className={`grid gap-4 ${cols}`}>
        {Array.from({ length: variant === "shopify" ? 6 : 4 }).map((_, i) => <MetricCardSkeleton key={`p-${i}`} size="md" />)}
      </div>
      {variant !== "shopify" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={`s-${i}`} size="sm" />)}
        </div>
      )}

      {/* Chart placeholder */}
      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <ShimmerBlock className="h-4 w-40" />
        </div>
        <div className="p-6">
          <ShimmerBlock className="h-64 w-full rounded-lg" />
        </div>
      </div>

      {/* Table placeholder */}
      <div className="overflow-hidden rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <ShimmerBlock className="h-4 w-48" />
        </div>
        <div className="p-6 space-y-3">
          <ShimmerBlock className="h-8 w-full" style={{ background: "var(--bg-secondary)" }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientCardSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBlock className="h-5 w-32" />
        <ShimmerBlock className="h-4 w-20" />
      </div>
      <ShimmerBlock className="mb-2 h-4 w-48" />
      <div className="flex gap-2">
        <ShimmerBlock className="h-6 w-20 rounded-full" />
        <ShimmerBlock className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
