import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 font-sans">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Prism
        </h1>
        <p className="text-xl leading-relaxed text-gray-600">
          Convert your Meta &amp; Google Ads accounts into beautiful
          presentation decks in minutes.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-12 grid max-w-xl gap-6 text-left sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-2 font-semibold text-gray-900">Connect</h3>
            <p className="text-sm text-gray-600">
              Link your Meta Ads or Google Ads accounts via OAuth. Secure,
              read-only access.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-2 font-semibold text-gray-900">Configure</h3>
            <p className="text-sm text-gray-600">
              Pick your slides, timeframe, KPIs, and chart types. Save as
              presets.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-2 font-semibold text-gray-900">Generate</h3>
            <p className="text-sm text-gray-600">
              Hit go — we pull your data and build a polished deck in seconds.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-2 font-semibold text-gray-900">Export</h3>
            <p className="text-sm text-gray-600">
              Download as PPTX or open directly in Google Slides. Fully
              editable.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
