"use client";

import { useState } from "react";
import Link from "next/link";

type SlideType =
  | "kpi_overview"
  | "campaign_breakdown"
  | "trend_analysis"
  | "top_performers"
  | "audience_insights"
  | "budget_allocation"
  | "comparison"
  | "custom";

interface SlideOption {
  type: SlideType;
  label: string;
  description: string;
}

const SLIDE_OPTIONS: SlideOption[] = [
  {
    type: "kpi_overview",
    label: "KPI Overview",
    description: "Key metrics grid — spend, ROAS, CPA, CTR, etc.",
  },
  {
    type: "campaign_breakdown",
    label: "Campaign Breakdown",
    description: "Performance by campaign (bar chart or table)",
  },
  {
    type: "trend_analysis",
    label: "Trend Analysis",
    description: "Metrics over time (line chart)",
  },
  {
    type: "top_performers",
    label: "Top Performers",
    description: "Best performing campaigns or ad sets",
  },
  {
    type: "audience_insights",
    label: "Audience Insights",
    description: "Breakdown by age, gender, device, placement",
  },
  {
    type: "budget_allocation",
    label: "Budget Allocation",
    description: "Spend distribution across campaigns",
  },
  {
    type: "comparison",
    label: "Period Comparison",
    description: "Period-over-period or cross-campaign comparison",
  },
  {
    type: "custom",
    label: "Custom Slide",
    description: "Select specific metrics and chart type",
  },
];

const DEFAULT_SLIDES: SlideType[] = [
  "kpi_overview",
  "campaign_breakdown",
  "trend_analysis",
  "top_performers",
];

type OutputFormat = "pptx" | "google_slides";

export default function GeneratePage() {
  const [selectedSlides, setSelectedSlides] =
    useState<SlideType[]>(DEFAULT_SLIDES);
  const [timeframe, setTimeframe] = useState("last_30d");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("pptx");

  function toggleSlide(type: SlideType) {
    setSelectedSlides((prev) =>
      prev.includes(type)
        ? prev.filter((s) => s !== type)
        : [...prev, type]
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            Deckify
          </Link>
          <span className="text-sm text-gray-500">New Deck</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Step 1: Client & Account */}
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            1. Select Client &amp; Account
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Choose which client and ad accounts to include
          </p>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-400">
              Connect an ad account from the dashboard first
            </p>
          </div>
        </section>

        {/* Step 2: Timeframe */}
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            2. Timeframe
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Select the date range for your report
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "last_7d", label: "Last 7 days" },
              { value: "last_14d", label: "Last 14 days" },
              { value: "last_30d", label: "Last 30 days" },
              { value: "last_90d", label: "Last 90 days" },
              { value: "custom", label: "Custom range" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeframe(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  timeframe === opt.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Slides */}
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            3. Choose Slides
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Default: 4 slides per channel. Check the slides you want to include.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SLIDE_OPTIONS.map((slide) => (
              <button
                key={slide.type}
                onClick={() => toggleSlide(slide.type)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedSlides.includes(slide.type)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <h3
                  className={`text-sm font-semibold ${
                    selectedSlides.includes(slide.type)
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  {slide.label}
                </h3>
                <p
                  className={`mt-1 text-xs ${
                    selectedSlides.includes(slide.type)
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {slide.description}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {selectedSlides.length} slide{selectedSlides.length !== 1 && "s"}{" "}
            selected per channel
          </p>
        </section>

        {/* Step 4: Output Format */}
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            4. Output Format
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Choose how you want your deck delivered
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setOutputFormat("pptx")}
              className={`flex-1 rounded-lg border p-4 text-left transition-colors ${
                outputFormat === "pptx"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <h3
                className={`text-sm font-semibold ${
                  outputFormat === "pptx" ? "text-white" : "text-gray-900"
                }`}
              >
                Download PPTX
              </h3>
              <p
                className={`mt-1 text-xs ${
                  outputFormat === "pptx" ? "text-gray-300" : "text-gray-500"
                }`}
              >
                PowerPoint file — works in PowerPoint, Keynote, Google Slides
              </p>
            </button>
            <button
              onClick={() => setOutputFormat("google_slides")}
              className={`flex-1 rounded-lg border p-4 text-left transition-colors ${
                outputFormat === "google_slides"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <h3
                className={`text-sm font-semibold ${
                  outputFormat === "google_slides"
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                Google Slides
              </h3>
              <p
                className={`mt-1 text-xs ${
                  outputFormat === "google_slides"
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                Native Google Slides in your Drive — editable, shareable
              </p>
            </button>
          </div>
        </section>

        {/* Generate Button */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800">
            Generate Deck
          </button>
        </div>
      </main>
    </div>
  );
}
