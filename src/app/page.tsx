import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent-primary)" }} />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent-secondary)" }} />
      </div>

      <main className="relative flex max-w-2xl flex-col items-center gap-8 text-center animate-fade-in">
        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))", boxShadow: "var(--shadow-glow)" }}>
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gradient">Prism</h1>
        <p className="text-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Your marketing intelligence hub. Dashboard analytics, ad performance decks, and Shopify insights — all in one place.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="rounded-xl px-8 py-3 text-sm font-bold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))", boxShadow: "var(--shadow-glow)" }}>
            Get Started
          </Link>
          <Link href="/dashboard" className="rounded-xl px-8 py-3 text-sm font-medium transition-all hover:scale-105" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}>
            Dashboard
          </Link>
        </div>

        <div className="mt-8 grid max-w-xl gap-4 text-left sm:grid-cols-2 stagger-children">
          {[
            { title: "Connect", desc: "Link Meta Ads, Google Ads, and Shopify via OAuth. Secure, read-only access.", icon: "🔗" },
            { title: "Analyze", desc: "Real-time dashboard with cross-platform metrics, MER, and blended ROAS.", icon: "📊" },
            { title: "Generate", desc: "Beautiful decks in seconds. Choose your slides, timeframe, and format.", icon: "✨" },
            { title: "Export", desc: "Download as PPTX or open directly in Google Slides. Fully editable.", icon: "📤" },
          ].map((item) => (
            <div key={item.title} className="group rounded-xl p-5 transition-all duration-200 hover:-translate-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-sm)" }}>
              <span className="text-xl">{item.icon}</span>
              <h3 className="mt-2 font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
