"use client";

import { useState, useRef, useEffect } from "react";

export interface DateRangeValue {
  start: string; // ISO date string: "2025-01-01"
  end: string;
}

interface DateRangePickerProps {
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function displayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function displayRange(value: DateRangeValue | null): string {
  if (!value) return "Last 7 days";
  return `${displayDate(value.start)} \u2013 ${displayDate(value.end)}`;
}

type Preset = { label: string; getValue: () => DateRangeValue };

function getPresets(): Preset[] {
  const today = new Date();
  const todayStr = formatDate(today);

  const daysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return formatDate(d);
  };

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  return [
    { label: "Last 7 days", getValue: () => ({ start: daysAgo(7), end: todayStr }) },
    { label: "Last 14 days", getValue: () => ({ start: daysAgo(14), end: todayStr }) },
    { label: "Last 30 days", getValue: () => ({ start: daysAgo(30), end: todayStr }) },
    { label: "Last 90 days", getValue: () => ({ start: daysAgo(90), end: todayStr }) },
    { label: "This month", getValue: () => ({ start: formatDate(startOfMonth), end: todayStr }) },
    { label: "Last month", getValue: () => ({ start: formatDate(startOfLastMonth), end: formatDate(endOfLastMonth) }) },
  ];
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [startInput, setStartInput] = useState(value?.start ?? "");
  const [endInput, setEndInput] = useState(value?.end ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when value changes externally
  useEffect(() => {
    setStartInput(value?.start ?? "");
    setEndInput(value?.end ?? "");
  }, [value]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const presets = getPresets();

  function applyCustom() {
    if (startInput && endInput && startInput <= endInput) {
      onChange({ start: startInput, end: endInput });
      setOpen(false);
    }
  }

  function applyPreset(preset: Preset) {
    const val = preset.getValue();
    onChange(val);
    setStartInput(val.start);
    setEndInput(val.end);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ color: "var(--text-tertiary)" }}>
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2V2.75A.75.75 0 0 1 5.75 2ZM3.5 8v8.5h13V8h-13Z" clipRule="evenodd" />
        </svg>
        <span>{displayRange(value)}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: "var(--text-tertiary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Presets */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border-secondary)" }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Quick select</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="btn-ghost rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range inputs */}
          <div className="px-3 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Custom range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                max={endInput || undefined}
                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                  colorScheme: "dark",
                }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>to</span>
              <input
                type="date"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                min={startInput || undefined}
                max={formatDate(new Date())}
                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              {value && (
                <button
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Reset
                </button>
              )}
              <button
                onClick={applyCustom}
                disabled={!startInput || !endInput || startInput > endInput}
                className="btn-solid rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
                style={{ background: "var(--accent-primary)" }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
