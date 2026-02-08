import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Deckify</h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/generate"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              New Deck
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Clients Section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Add Client
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              No clients yet. Add a client to connect their ad accounts and
              start generating decks.
            </p>
          </div>
        </section>

        {/* Recent Decks Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Decks
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              No decks generated yet. Create your first deck to see it here.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
