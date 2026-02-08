import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  trend?: "up" | "down" | "flat";
  size?: "sm" | "md" | "lg";
}

export function MetricCard({ label, value, change, trend, size = "md" }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-1 font-bold text-gray-900",
          size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-xl"
        )}
      >
        {value}
      </p>
      {change !== undefined && (
        <p
          className={cn(
            "mt-1 text-sm font-medium",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
          )}
        >
          {trend === "up" ? "\u25B2" : trend === "down" ? "\u25BC" : "\u25CF"}{" "}
          {Math.abs(change).toFixed(1)}% vs prev. period
        </p>
      )}
    </div>
  );
}
