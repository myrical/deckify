"use client";

import { useState } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";

type SlideType = "kpi_overview" | "campaign_breakdown" | "trend_analysis" | "top_performers" | "audience_insights" | "budget_allocation" | "comparison" | "custom";

interface SlideOption { type: SlideType; label: string; description: string; icon: string; }

const SLIDE_OPTIONS: SlideOption[] = [
  { type: "kpi_overview", label: "KPI Overview", description: "Key metrics grid — spend, ROAS, CPA, CTR", icon: "📊" },
  { type: "campaign_breakdown", label: "Campaign Breakdown", description: "Performance by campaign (bar chart or table)", icon: "📈" },
  { type: "trend_analysis", label: "Trend Analysis", description: "Metrics over time (line chart)", icon: "📉" },
  { type: "top_performers", label: "Top Performers", description: "Best performing campaigns or ad sets", icon: "🏆" },
  { type: "audience_insights", label: "Audience Insights", description: "Breakdown by age, gender, device", icon: "👥" },
  { type: "budget_allocation", label: "Budget Allocation", description: "Spend distribution across campaigns", icon: "💰" },
  { type: "comparison", label: "Period Comparison", description: "Period-over-period comparison", icon: "🔄" },
  { type: "custom", label: "Custom Slide", description: "Select specific metrics and chart type", icon: "✨" },
];

const DEFAULT_SLIDES: SlideType[] = ["kpi_overview", "campaign_breakdown", "trend_analysis", "top_performers"];

type OutputFormat = "pptx" | "google_slides";

interface Preset {
  name: string;
  slides: SlideType[];
  timeframe: string;
  outputFormat: OutputFormat;
}

const STEPS = ["Account", "Timeframe", "Slides", "Output", "Review"];

export default function GeneratePage() {
  const [step, setStep] = useState(0);
  const [selectedSlides, setSelectedSlides] = useState<SlideType[]>(DEFAULT_SLIDES);
  const [timeframe, setTimeframe] = useState("last_30d");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pptx");
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [savedPresets, setSavedPresets] = useState<Preset[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("prism-presets") || "[]"); } catch { return []; }
  });

  function toggleSlide(type: SlideType) {
    setSelectedSlides((prev) => prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]);
  }

  function savePreset() {
    if (!presetName.trim()) return;
    const preset: Preset = { name: presetName.trim(), slides: selectedSlides, timeframe, outputFormat };
    const updated = [...savedPresets.filter(p => p.name !== preset.name), preset];
    setSavedPresets(updated);
    localStorage.setItem("prism-presets", JSON.stringify(updated));
    setPresetName("");
    setShowSavePreset(false);
  }

  function loadPreset(preset: Preset) {
    setSelectedSlides(preset.slides);
    setTimeframe(preset.timeframe);
    setOutputFormat(preset.outputFormat);
  }

  function deletePreset(name: string) {
    const updated = savedPresets.filter(p => p.name !== name);
    setSavedPresets(updated);
    localStorage.setItem("prism-presets", JSON.stringify(updated));
  }

  const timeframeLabel = { last_7d: "Last 7 days", last_14d: "Last 14 days", last_30d: "Last 30 days", last_90d: "Last 90 days", custom: "Custom range" }[timeframe] || timeframe;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <NavHeader />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main content */}
          <div>
            {/* Progress bar */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                {STEPS.map((s, i) => (
                  <button key={s} onClick={() => i <= step && setStep(i)} className="flex items-center gap-2 text-xs font-medium transition-all" style={{ color: i <= step ? "var(--accent-primary)" : "var(--text-tertiary)", cursor: i <= step ? "pointer" : "default" }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all" style={{
                      background: i < step ? "var(--accent-primary)" : i === step ? "var(--accent-primary-light)" : "var(--bg-tertiary)",
                      color: i < step ? "var(--text-inverse)" : i === step ? "var(--accent-primary)" : "var(--text-tertiary)",
                    }}>{i < step ? "✓" : i + 1}</span>
                    <span className="hidden sm:inline">{s}</span>
                  </button>
                ))}
              </div>
              <div className="h-1 rounded-full" style={{ background: "var(--bg-tertiary)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }} />
              </div>
            </div>

            {/* Step content */}
            <div key={step} className="animate-slide-in-right">
              {step === 0 && (
                <section>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Select Client & Account</h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Choose which client and ad accounts to include in your deck</p>
                  <div className="flex items-center justify-center rounded-xl py-12" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--accent-primary-light), rgba(236, 72, 153, 0.08))" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth={2} className="h-6 w-6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Connect an ad account from the dashboard first</p>
                    </div>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Select Timeframe</h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Choose the date range for your report</p>
                  <div className="flex flex-wrap gap-3">
                    {[{ value: "last_7d", label: "Last 7 days" }, { value: "last_14d", label: "Last 14 days" }, { value: "last_30d", label: "Last 30 days" }, { value: "last_90d", label: "Last 90 days" }, { value: "custom", label: "Custom range" }].map((opt) => (
                      <button key={opt.value} onClick={() => setTimeframe(opt.value)} className="rounded-xl px-5 py-3 text-sm font-medium transition-all hover:scale-105" style={{
                        background: timeframe === opt.value ? "var(--accent-primary)" : "var(--bg-card)",
                        color: timeframe === opt.value ? "var(--text-inverse)" : "var(--text-primary)",
                        border: `1px solid ${timeframe === opt.value ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        boxShadow: timeframe === opt.value ? "var(--shadow-glow)" : "var(--shadow-sm)",
                      }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Choose Your Slides</h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Default: 4 slides per channel. Select the ones you want.
                    <span className="ml-2 font-semibold" style={{ color: "var(--accent-primary)" }}>{selectedSlides.length} selected</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SLIDE_OPTIONS.map((slide) => {
                      const selected = selectedSlides.includes(slide.type);
                      return (
                        <button key={slide.type} onClick={() => toggleSlide(slide.type)} className="group rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02]" style={{
                          background: selected ? "var(--accent-primary)" : "var(--bg-card)",
                          border: `1px solid ${selected ? "var(--accent-primary)" : "var(--border-primary)"}`,
                          boxShadow: selected ? "var(--shadow-glow)" : "var(--shadow-sm)",
                        }}>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{slide.icon}</span>
                            <div>
                              <h3 className="text-sm font-semibold" style={{ color: selected ? "var(--text-inverse)" : "var(--text-primary)" }}>{slide.label}</h3>
                              <p className="mt-0.5 text-xs" style={{ color: selected ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>{slide.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {step === 3 && (
                <section>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Output Format</h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>How would you like your deck delivered?</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([{ value: "pptx" as const, title: "Download PPTX", desc: "PowerPoint file — works in PowerPoint, Keynote, Google Slides", icon: "📥" }, { value: "google_slides" as const, title: "Google Slides", desc: "Native Google Slides in your Drive — editable, shareable", icon: "🔗" }]).map((opt) => (
                      <button key={opt.value} onClick={() => setOutputFormat(opt.value)} className="rounded-xl p-6 text-left transition-all duration-200 hover:scale-[1.02]" style={{
                        background: outputFormat === opt.value ? "var(--accent-primary)" : "var(--bg-card)",
                        border: `1px solid ${outputFormat === opt.value ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        boxShadow: outputFormat === opt.value ? "var(--shadow-glow)" : "var(--shadow-sm)",
                      }}>
                        <span className="text-2xl">{opt.icon}</span>
                        <h3 className="mt-3 text-sm font-semibold" style={{ color: outputFormat === opt.value ? "var(--text-inverse)" : "var(--text-primary)" }}>{opt.title}</h3>
                        <p className="mt-1 text-xs" style={{ color: outputFormat === opt.value ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 4 && (
                <section>
                  <h2 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Review & Generate</h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Everything looks good? Hit generate!</p>
                  <div className="space-y-4">
                    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Timeframe</span><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{timeframeLabel}</span></div>
                        <div className="flex justify-between"><span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Slides</span><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selectedSlides.length} per channel</span></div>
                        <div className="flex justify-between"><span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Output</span><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{outputFormat === "pptx" ? "PPTX Download" : "Google Slides"}</span></div>
                      </div>
                    </div>
                    <button className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all hover:scale-[1.01] animate-pulse-glow" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}>
                      Generate Deck
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(Math.max(0, step - 1))} className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-secondary)", opacity: step === 0 ? 0.4 : 1 }} disabled={step === 0}>
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}>
                  Continue
                </button>
              ) : null}
            </div>
          </div>

          {/* Sidebar: Summary + Presets */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Decision summary */}
              <div className="rounded-xl p-5 animate-fade-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Your Deck</h3>
                <div className="space-y-3 text-sm">
                  <div><span style={{ color: "var(--text-tertiary)" }}>Timeframe:</span> <span className="font-medium" style={{ color: "var(--text-primary)" }}>{timeframeLabel}</span></div>
                  <div><span style={{ color: "var(--text-tertiary)" }}>Slides:</span> <span className="font-medium" style={{ color: "var(--accent-primary)" }}>{selectedSlides.length}</span></div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSlides.map(s => <span key={s} className="rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--accent-primary-light)", color: "var(--accent-primary)" }}>{SLIDE_OPTIONS.find(o => o.type === s)?.icon}</span>)}
                  </div>
                  <div><span style={{ color: "var(--text-tertiary)" }}>Output:</span> <span className="font-medium" style={{ color: "var(--text-primary)" }}>{outputFormat === "pptx" ? "PPTX" : "Google Slides"}</span></div>
                </div>
              </div>

              {/* Presets */}
              <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Presets</h3>
                  <button onClick={() => setShowSavePreset(!showSavePreset)} className="text-xs font-medium" style={{ color: "var(--accent-primary)" }}>
                    {showSavePreset ? "Cancel" : "+ Save"}
                  </button>
                </div>

                {showSavePreset && (
                  <div className="mb-3 flex gap-2 animate-fade-in">
                    <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name..." className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none" style={{ background: "var(--bg-input)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }} onKeyDown={(e) => e.key === "Enter" && savePreset()} />
                    <button onClick={savePreset} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ background: "var(--accent-primary)" }}>Save</button>
                  </div>
                )}

                {savedPresets.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No saved presets yet</p>
                ) : (
                  <div className="space-y-2">
                    {savedPresets.map((preset) => (
                      <div key={preset.name} className="flex items-center justify-between rounded-lg p-2 transition-colors" style={{ background: "var(--bg-secondary)" }}>
                        <button onClick={() => loadPreset(preset)} className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{preset.name}</button>
                        <button onClick={() => deletePreset(preset.name)} className="text-xs" style={{ color: "var(--text-tertiary)" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
