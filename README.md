# Deckify

**Convert your Meta & Google Ads accounts into beautiful presentation decks in minutes.**

## What is Deckify?

Deckify is a tool for marketers who need to create professional ad performance decks without the manual copy-paste grind. Connect your ad accounts, choose your presets, and export a polished deck — as a downloadable PPTX or directly into Google Slides.

## Features (Planned)

- **OAuth Integration** — Connect Meta Ads and Google Ads accounts securely
- **Smart Questionnaire** — Select timeframe, KPIs, areas of focus, and chart types
- **AI Analysis** — Optional AI-powered insights and commentary (via Claude API)
- **Dual Output** — Download as PPTX or generate directly in Google Slides
- **Saved Presets** — Label and reuse your favorite configurations
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

### Data Pipeline

On-demand pull with session caching:
- When user hits "Generate," fresh data is pulled from the ad platform APIs
- Data is cached for the session (~30 min) so re-generating with different presets doesn't re-fetch
- No persistent data warehouse — keeps architecture simple

### Deck Generation (Dual Renderer)

Abstract `DeckRenderer` interface with two implementations:

| Renderer | Library | Output |
|---|---|---|
| `PptxRenderer` | PptxGenJS (server-side Node.js) | Downloadable .pptx file |
| `GoogleSlidesRenderer` | Google Slides API + Sheets API | Native Google Slides in user's Drive |

Both renderers share the same slide composition layer: `addTitleSlide()`, `addKPISlide()`, `addChartSlide()`, etc. Slide templates are defined as a programmatic design system (color palettes, typography, spacing rules).

### Infrastructure

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| App Auth | NextAuth.js |
| Database | PostgreSQL (Neon) + Prisma ORM |
| AI Analysis | Claude API |
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

## User Flow Example: Meta Ads + Google Slides Output

1. User signs into Deckify (email magic link or Google sign-in)
2. Connects Meta Ads from integrations page (Facebook OAuth popup, selects ad account)
3. Clicks "New Deck," enters questionnaire (account, timeframe, KPIs, charts, focus areas)
4. Selects "Google Slides" as output — just-in-time prompt: "Connect Google Drive to create your deck there" — popup, authorize, done
5. Hits "Generate" — loading screen with progress steps
6. Gets "Open in Google Slides" link — native, editable, shareable presentation in their Drive

## Status

Early Development — Architecture finalized, implementation starting.

## License

MIT
