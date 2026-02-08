# Deckify

**Convert your Meta & Google Ads accounts into beautiful presentation decks in minutes.**

## What is Deckify?

Deckify is a tool for marketers who need to create professional ad performance decks without the manual copy-paste grind. Connect your ad accounts, choose your presets, and export a polished deck — as a downloadable PPTX or directly into Google Slides.

## Features (Planned)

- **OAuth Integration** — Connect Meta Ads and Google Ads accounts securely
- **Multi-Client Management** — Manage multiple clients/brands, each with their own ad accounts
- **Smart Questionnaire** — Select slide count, topics, timeframe, KPIs, areas of focus, and chart types
- **AI Analysis** — Optional AI-powered insights and commentary (post-MVP, via Claude API)
- **Dual Output** — Download as PPTX or generate directly in Google Slides
- **Saved Presets** — Label and reuse your favorite configurations per client
- **Just-in-Time Auth** — Connect services exactly when you need them, not upfront

## How It Works

1. **Connect** — Link your Meta or Google Ads account via OAuth
2. **Configure** — Quick questionnaire: timeframe, KPIs, focus areas, chart types, optional analysis
3. **Generate** — Hit "Go" — Deckify pulls your data, analyzes trends, and builds the deck
4. **Export** — Download PPTX or open directly in Google Slides

## Architecture

### Auth Strategy (Separated Concerns)

| Purpose | Method | Details |
|---|---|---|
| **App login** | NextAuth.js | Google sign-in or email magic link |
| **Ad data source** | Custom OAuth per platform | Meta Ads (`ads_read`), Google Ads (`adwords`) — tokens stored encrypted server-side |
| **Output destination** | Just-in-time OAuth | Google Drive/Slides/Sheets scopes — prompted only when user selects Google Slides output |

### Multi-Client Data Model

Designed for agencies and marketers managing multiple brands:

```
Organization (agency / freelancer)
  └── Client (brand)
       └── AdAccount (platform-specific, many per client)
            └── Connection (encrypted OAuth tokens)
       └── Presets (saved deck configurations per client)
```

- One user can manage many clients
- Each client can have multiple ad accounts across Meta and Google
- Presets are saved per client (e.g., "Acme Corp — Monthly Executive Summary")
- Organization-level presets also supported (shared templates across clients)

### Data Pipeline

On-demand pull with session caching:
- When user hits "Generate," fresh data is pulled from the ad platform APIs
- Data is cached for the session (~30 min) so re-generating with different presets doesn't re-fetch
- Cache key includes client + account ID so multi-client data never mixes
- No persistent data warehouse — keeps architecture simple

### Deck Generation (Dual Renderer)

Abstract `DeckRenderer` interface with two implementations:

| Renderer | Library | Output |
|---|---|---|
| `PptxRenderer` | PptxGenJS (server-side Node.js) | Downloadable .pptx file |
| `GoogleSlidesRenderer` | Google Slides API + Sheets API | Native Google Slides in user's Drive |

Both renderers share the same slide composition layer: `addTitleSlide()`, `addKPISlide()`, `addChartSlide()`, etc. Slide templates are defined as a programmatic design system (color palettes, typography, spacing rules).

### Slide Structure

Default: **4 slides per channel** (8 slides for a combined Meta + Google deck). Users select slide count and topics in the questionnaire.

Available slide types per channel:
- **KPI Overview** — Key metrics grid (spend, ROAS, CPA, CTR, etc.)
- **Campaign Breakdown** — Performance by campaign (bar/table)
- **Trend Analysis** — Metrics over time (line chart)
- **Top Performers** — Best performing campaigns/ad sets
- **Audience Insights** — Breakdown by age, gender, device, placement
- **Budget Allocation** — Spend distribution across campaigns
- **Comparison** — Period-over-period or cross-campaign comparison
- **Custom** — User selects specific metrics and chart type

Users check which slides they want and reorder them in the questionnaire. Presets remember these selections.

### Infrastructure

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| App Auth | NextAuth.js |
| Database | PostgreSQL (Neon) + Prisma ORM |
| AI Analysis | Claude API (post-MVP) |
| PPTX Generation | PptxGenJS |
| Google Slides | Google Slides API + Sheets API |
| File Storage | Vercel Blob (temporary deck storage) |
| Caching | Vercel KV (Redis) |
| Deployment | Vercel |

### Ad Platform SDKs

| Platform | SDK | Scopes |
|---|---|---|
| Meta Ads | `facebook-nodejs-business-sdk` | `ads_read` |
| Google Ads | `google-ads-api` (Opteo) | `adwords` |
| Google Slides output | `googleapis` | `drive.file`, `spreadsheets`, `presentations` |

## User Flow Example: Agency with Meta + Google Ads → Google Slides

1. User signs into Deckify (email magic link or Google sign-in)
2. Creates a client: "Acme Corp"
3. Connects Meta Ads and Google Ads to Acme Corp (OAuth popups, selects ad accounts)
4. Clicks "New Deck" for Acme Corp, enters questionnaire:
   - Channels: Meta Ads + Google Ads (8 slides default)
   - Checks which slides: KPI Overview, Campaign Breakdown, Trend Analysis, Top Performers (per channel)
   - Timeframe: Last 30 days
   - KPIs: Spend, ROAS, CPA, CTR
5. Selects "Google Slides" as output — just-in-time prompt: "Connect Google Drive to create your deck there"
6. Hits "Generate" — streaming progress: pulling Meta data → pulling Google data → building slides
7. Gets "Open in Google Slides" link — native, editable, shareable
8. Saves this configuration as preset: "Acme Corp — Monthly Report"

## Cost Estimates

### Infrastructure (Monthly)

| Service | Free Tier | Growth (~100 users) | Scale (~1,000 users) |
|---|---|---|---|
| **Vercel** (Pro) | — | $20 | $20 + usage |
| **Neon PostgreSQL** | 0.5 GB free | $0 (free tier) | $19 |
| **Vercel KV** (Redis) | 3K req/day free | $0 (free tier) | $30 |
| **Vercel Blob** | 250 MB free | $0 (free tier) | ~$5 |
| **Domain** | — | ~$1 (annualized) | ~$1 |
| **Total infra** | **$0** | **~$21/mo** | **~$75/mo** |

### External APIs (All Free)

| API | Cost | Notes |
|---|---|---|
| Meta Marketing API | Free | No per-call charges, rate-limited |
| Google Ads API | Free | No per-call charges, rate-limited |
| Google Slides/Sheets API | Free | Generous quotas (300 req/min/project) |
| PptxGenJS | Free | MIT license, runs locally |
| NextAuth.js | Free | Open source |

### Post-MVP: Claude API (per deck generation)

| Usage Level | Est. Cost/Deck | Monthly (100 decks) | Monthly (1,000 decks) |
|---|---|---|---|
| Light analysis (summary only) | ~$0.005 | ~$0.50 | ~$5 |
| Full analysis (insights per slide) | ~$0.02 | ~$2 | ~$20 |

### Key Takeaway

**MVP runs essentially free.** The ad platform APIs, deck generation library, and auth are all free. The only hard costs are Vercel hosting ($20/mo on Pro) and database if you outgrow free tiers. The most expensive thing at scale would be Claude API if added — but even at 1,000 decks/month with full analysis, that's ~$20/month. This is an extremely low-cost-to-run product.

## Status

Early Development — Architecture finalized, implementation starting.

## License

MIT
