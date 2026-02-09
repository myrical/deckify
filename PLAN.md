# Dashboard Redesign Plan

## Context

The current dashboard (`src/app/dashboard/page.tsx`) is a single "use client" page that vertically stacks ConnectAccounts → DataSources → PlatformTabs/Views. After connecting Meta (which discovers 100+ ad accounts), the user sees an overwhelming flat list with no search or pagination. The analytics views show "Connect your account" even when connected because no data is ever fetched. The user's feedback: "it's 99% setup and zero substance."

This redesign replaces the single-page scroll with a sidebar layout + dedicated sub-pages, enforcing a strict **client-scoped** data model where analytics are never blended across clients.

---

## UX Decisions (locked in)

### Default Landing — Client-by-Client Summary
- **Overview page** (`/dashboard`) shows a card per client, each with its own metrics (spend, revenue, ROAS by platform). Data is **never blended** across clients.
- Unassigned data sources are **invisible** in analytics — they don't appear until assigned to a client.
- **Per-platform pages** (Meta, Google, Shopify) have a **client dropdown** at the top. Defaults to first client alphabetically. No "All Clients" blended option.
- If no clients or no assigned data sources exist → show onboarding prompt.

### Data Source Assignment Flow
- **Data Sources page** (`/dashboard/data-sources`) defaults to showing **unassigned only**.
- Search bar (debounced, by name or platformId) + platform filter pills + status toggle.
- **Single assign**: each row has "Assign to..." dropdown → select client or "+ New Client" (inline creation).
- **Bulk assign**: checkboxes → sticky bottom bar → "Assign X selected to..." dropdown.
- After first OAuth redirect, user lands on Data Sources page with banner: "X accounts discovered. Assign to a client to start seeing analytics."
- Pagination at 25 per page.

---

## Layout & Route Structure

```
src/app/dashboard/
  layout.tsx                    — NEW: sidebar shell (server component)
  page.tsx                      — REWRITE: client-by-client overview
  meta/page.tsx                 — NEW: Meta analytics (client-scoped)
  google/page.tsx               — NEW: Google analytics (client-scoped)
  shopify/page.tsx              — NEW: Shopify analytics (client-scoped)
  clients/page.tsx              — NEW: client list + create
  clients/[id]/page.tsx         — NEW: single client detail + analytics
  data-sources/page.tsx         — NEW: searchable assignment hub
  connections/page.tsx          — NEW: platform OAuth management
  components/sidebar.tsx        — EXISTS: update to accept server data as props
  components/connect-accounts.tsx — EXISTS: move into connections/page.tsx
  components/data-sources.tsx   — EXISTS: replace with new implementation
  components/clients-section.tsx — EXISTS: replace with new implementation
  components/aggregate-view.tsx — REUSE: pass real data
  components/meta-view.tsx      — REUSE: pass real data
  components/google-view.tsx    — REUSE: pass real data
  components/shopify-view.tsx   — REUSE: pass real data
  components/metric-card.tsx    — REUSE: unchanged
  components/platform-tabs.tsx  — DELETE: replaced by sidebar nav
```

---

## Implementation Phases

### Phase 1: Layout + Sidebar + Routing Shell

**Goal**: Get sidebar navigation working with empty sub-pages.

**Create `src/app/dashboard/layout.tsx`** (server component):
- Fetch from DB via Prisma (not API route): org's platformAuths (count, which platforms), adAccount count where clientId=null
- Pass `sidebarData` props to Sidebar: `{ connectionCount, unassignedCount, connectedPlatforms }`
- Render: `<div className="flex h-screen"><Sidebar {...sidebarData} /><main className="flex-1 overflow-auto">{children}</main></div>`

**Modify `src/app/dashboard/components/sidebar.tsx`**:
- Change from fetching `/api/connections` on mount → accept props from layout (removes client-side fetch flicker)
- Keep `usePathname()` for active state highlighting
- Keep existing nav structure, icons, badges

**Create stub pages** (each renders a heading + placeholder):
- `src/app/dashboard/meta/page.tsx`
- `src/app/dashboard/google/page.tsx`
- `src/app/dashboard/shopify/page.tsx`
- `src/app/dashboard/clients/page.tsx`
- `src/app/dashboard/data-sources/page.tsx`
- `src/app/dashboard/connections/page.tsx`

**Modify `src/app/dashboard/page.tsx`**:
- Strip all existing content (ConnectAccounts, DataSources, PlatformTabs)
- Render placeholder "Overview" content

**Delete unused**: `src/app/dashboard/components/platform-tabs.tsx`

---

### Phase 2: Connections Page + Data Sources Page

**`src/app/dashboard/connections/page.tsx`**:
- Render existing `ConnectAccounts` component (move import, no rewrite needed)
- Add header showing connection status summary
- Keep existing OAuth redirect flows unchanged

**`src/app/dashboard/data-sources/page.tsx`** (new client component):
- **Search**: debounced input (300ms), searches `name` and `platformId`
- **Filters**: platform pills (All | Meta | Google | Shopify), status toggle (Unassigned | Assigned | All), default = Unassigned
- **Table rows**: checkbox, platform icon, account name, platform ID, "Assign to" dropdown
- **Single assign**: dropdown per row with client list + "+ New Client" option. "+ New Client" shows inline text input in the dropdown. On select/create → PATCH `/api/data-sources`
- **Bulk assign**: when checkboxes selected, sticky bar at bottom: "X selected [Assign to ▾] [Clear]". Assign → POST `/api/data-sources/bulk-assign`
- **Pagination**: 25 per page, prev/next buttons, total count display
- **Post-OAuth banner**: if `?success=xxx_connected` in URL, show "Platform connected — X accounts discovered. Assign to a client to start seeing analytics."

**Modify `src/app/api/data-sources/route.ts` GET**:
- Add query params: `?search=&platform=&status=unassigned&page=1&limit=25`
- Prisma `where` clause: `name contains search OR platformId contains search`, `platform equals`, `clientId is null / is not null`
- Return `{ dataSources, clients, total, page, limit }`

**Create `src/app/api/data-sources/bulk-assign/route.ts`**:
- POST `{ dataSourceIds: string[], clientId: string }`
- Verify all dataSourceIds belong to user's org
- Verify clientId belongs to same org
- `prisma.adAccount.updateMany({ where: { id: { in: dataSourceIds } }, data: { clientId } })`

**Update OAuth callbacks** (`src/app/api/meta/callback/route.ts`, etc.):
- Change redirect from `/dashboard?success=...` → `/dashboard/data-sources?success=...`

---

### Phase 3: Overview + Analytics Pages

**Create `src/lib/analytics.ts`** — server-side data fetching:
- `getOverviewByClient(orgId: string)` → array of `{ client, platforms: { meta?: summary, google?: summary, shopify?: summary } }`
  - For each client: find assigned adAccounts → group by platform → for each platformAuth, call connector's `fetchAccountSummary`
  - Return per-client, per-platform summaries
- `getClientAnalytics(clientId: string, platform: AdPlatform)` → platform-specific view data
  - Find client's adAccounts for that platform → fetch via connector → transform to view component shape (`MetaViewData`, etc.)

**Rewrite `src/app/dashboard/page.tsx`** (Overview):
- Server component that calls `getOverviewByClient(orgId)`
- Renders client cards: each card shows client name + per-platform spend/revenue/ROAS
- "View" link on each card → `/dashboard/clients/[id]`
- Empty state if no clients or no assigned data sources → CTA to Data Sources page
- Client component wrapper for date range picker (default: last 7 days)

**Create `src/app/api/analytics/route.ts`**:
- `GET /api/analytics?clientId=xxx&platform=meta&start=2025-01-01&end=2025-01-07`
- Used for client-side date range changes without full page reload
- Returns platform-specific view data shape

**Build per-platform pages** (`meta/page.tsx`, `google/page.tsx`, `shopify/page.tsx`):
- Client dropdown at top (fetched from org's clients that have accounts on this platform)
- Selected client stored in URL search param: `/dashboard/meta?client=xxx`
- Fetch analytics for selected client + platform → pass to existing view component
- Date range picker → re-fetches via `/api/analytics`

---

### Phase 4: Clients Page

**`src/app/dashboard/clients/page.tsx`**:
- List of client cards with: name, data source count by platform, total spend (if available)
- "+ Create Client" button → inline form (name input + create)
- Each card links to `/dashboard/clients/[id]`

**`src/app/dashboard/clients/[id]/page.tsx`**:
- Client header (name, created date)
- Platform tabs showing that client's analytics (reuses MetaView, GoogleView, ShopifyView)
- "Assigned Data Sources" section listing the client's accounts
- "Generate Deck" button → `/generate?clientId=xxx`

---

## Files Summary

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/app/dashboard/layout.tsx` | Server component, sidebar shell |
| MODIFY | `src/app/dashboard/components/sidebar.tsx` | Props instead of fetch |
| REWRITE | `src/app/dashboard/page.tsx` | Client-by-client overview |
| CREATE | `src/app/dashboard/meta/page.tsx` | Meta analytics, client-scoped |
| CREATE | `src/app/dashboard/google/page.tsx` | Google analytics, client-scoped |
| CREATE | `src/app/dashboard/shopify/page.tsx` | Shopify analytics, client-scoped |
| CREATE | `src/app/dashboard/clients/page.tsx` | Client list |
| CREATE | `src/app/dashboard/clients/[id]/page.tsx` | Client detail + analytics |
| CREATE | `src/app/dashboard/data-sources/page.tsx` | Assignment hub |
| CREATE | `src/app/dashboard/connections/page.tsx` | OAuth management |
| CREATE | `src/lib/analytics.ts` | Server-side data fetching |
| CREATE | `src/app/api/analytics/route.ts` | Client-side analytics API |
| CREATE | `src/app/api/data-sources/bulk-assign/route.ts` | Bulk assignment |
| MODIFY | `src/app/api/data-sources/route.ts` | Add search/filter/pagination |
| MODIFY | `src/app/api/meta/callback/route.ts` | Redirect to /data-sources |
| MODIFY | `src/app/api/google/callback/route.ts` | Redirect to /data-sources |
| MODIFY | `src/app/api/shopify/callback/route.ts` | Redirect to /data-sources |
| DELETE | `src/app/dashboard/components/platform-tabs.tsx` | Replaced by sidebar |

## Reused Existing Code

- `src/app/dashboard/components/metric-card.tsx` — MetricCard component
- `src/app/dashboard/components/aggregate-view.tsx` — AggregateView (expects `AggregateData`)
- `src/app/dashboard/components/meta-view.tsx` — MetaView (expects `MetaViewData`)
- `src/app/dashboard/components/google-view.tsx` — GoogleView
- `src/app/dashboard/components/shopify-view.tsx` — ShopifyView
- `src/app/dashboard/components/connect-accounts.tsx` — moved to connections page as-is
- `src/core/ad-platforms/meta/connector.ts` — `fetchAccountSummary()`, `listAccounts()`
- `src/core/ad-platforms/google-ads/connector.ts` — `fetchAccountSummary()`
- `src/core/ad-platforms/shopify/connector.ts` — `fetchEcommerceSummary()`
- `src/core/ad-platforms/types.ts` — `AccountSummary`, `NormalizedMetrics`, `AdPlatformConnector`
- `src/lib/ensure-org.ts` — `ensureOrg()`
- `src/config/pricing.ts` — billing terminology

## Verification

1. `npx next build` passes
2. Sidebar navigation works — clicking each item loads correct sub-page
3. New user: sign in → Overview shows onboarding CTA → Connections page → connect Meta → redirected to Data Sources with banner → search/assign accounts → Overview shows client cards with metrics
4. Data Sources: search 100+ accounts, filter by platform, bulk assign to client, inline create client
5. Per-platform pages: client dropdown filters analytics to one client
6. Client detail page: shows that client's analytics + assigned data sources

---

## Phase 5: Fix Silent Analytics Failures

### Context
User has a connected Meta account assigned to a client ("test"), but the Meta page shows "Connect your Meta Ads account" because API errors are silently swallowed at every layer. The real Meta Graph API call fails (likely expired token, rate limit, or network issue), `fetchAccountSummary` throws, the catch block logs to server console and returns empty data, and the UI can't distinguish "no account" from "API error."

### Bug Chain
```
Meta page → /api/analytics?platform=meta&clientId=xxx
  → getMetaAnalytics(clientId) in src/lib/analytics.ts
    → db.adAccount.findMany() → finds accounts ✓
    → MetaAdsConnector.fetchAccountSummary() → real HTTP to graph.facebook.com → FAILS
    → catch (err) { console.error(...) } → swallowed
    → returns empty summaries[]
  → API returns { data: [] }
→ meta/page.tsx: summaries.length === 0 → setAnalyticsData(null)
→ MetaView receives data=null → "Connect your Meta Ads account"
```

### Fix Plan

**1. `src/lib/analytics.ts` — Return errors alongside data**

For each per-platform function (`getMetaAnalytics`, `getGoogleAnalytics`, `getShopifyAnalytics`), change return type to include errors:

```typescript
interface AnalyticsResult<T> {
  data: T[];
  errors: Array<{ accountId: string; accountName: string; error: string; code?: string }>;
  accountsFound: number;
}
```

In the catch blocks, push to `errors` array instead of silently dropping:
```typescript
} catch (err) {
  errors.push({
    accountId: acc.platformId,
    accountName: acc.name,
    error: err instanceof Error ? err.message : "Unknown error",
    code: err instanceof TokenExpiredError ? "TOKEN_EXPIRED"
        : err instanceof RateLimitError ? "RATE_LIMITED"
        : err instanceof AccountAccessError ? "ACCESS_DENIED"
        : "API_ERROR",
  });
}
```

**2. `src/app/api/analytics/route.ts` — Pass through errors**

Return `{ data, errors, accountsFound }` from each platform handler instead of just `{ data }`.

**3. `src/app/dashboard/meta/page.tsx` (and google, shopify) — Show meaningful states**

Add state for errors: `const [errors, setErrors] = useState<...[]>([])`.

After fetch, check:
- `accountsFound === 0` → "No Meta accounts assigned to this client" (with link to Data Sources)
- `errors.length > 0 && data.length === 0` → Show error banner with details (e.g. "Token expired — reconnect Meta" with link to Connections)
- `errors.length > 0 && data.length > 0` → Show data + warning banner for partial failures
- `data.length > 0` → Show MetaView with data (happy path)

**4. `src/app/dashboard/components/meta-view.tsx` (and google, shopify views) — Update empty states**

Change the `!data` empty state from "Connect your Meta Ads account" to just show nothing / a neutral loading placeholder, since the parent page now handles all empty/error states.

### Files to modify

| File | Change |
|------|--------|
| `src/lib/analytics.ts` | Return `{ data, errors, accountsFound }` from per-platform functions |
| `src/app/api/analytics/route.ts` | Pass through new return shape |
| `src/app/dashboard/meta/page.tsx` | Handle error states, show meaningful messages |
| `src/app/dashboard/google/page.tsx` | Same pattern |
| `src/app/dashboard/shopify/page.tsx` | Same pattern |
| `src/app/dashboard/clients/[id]/page.tsx` | Same pattern for platform tabs |
| `src/app/dashboard/components/meta-view.tsx` | Remove misleading "Connect" empty state |
| `src/app/dashboard/components/google-view.tsx` | Same |
| `src/app/dashboard/components/shopify-view.tsx` | Same |

### Verification
1. `npx next build` passes
2. With real connected Meta account: Meta page shows either real data or a specific error (e.g. "Token expired — reconnect Meta")
3. Overview page shows client card with data or error indicator
4. No more "Connect your account" when account IS connected

---

## Phase 6: Visual Redesign — Match Old Dashboard UX

### Context
User has an existing dashboard (`github.com/myrical/client-performance-dashboard`) with polished Recharts visualizations, creative ad preview cards (4:5 ratio, image proxy, ROAS bars), and a blended "All Platforms" MER section. Prism currently has basic tables + cramped metric cards. This phase ports the visual UX while keeping Prism's client-scoped architecture.

### Source Reference (old dashboard components read in full)
- `CreativeGrid.tsx` — 4:5 aspect ratio cards, image proxy, ROAS progress bar, 2×4 metrics grid
- `MERSection.tsx` — 4 giant centered KPIs (MER/ROAS/Revenue/Spend), platform status row, gradient card
- `CampaignCharts.tsx` — Side-by-side bar charts (Spend vs Revenue, ROAS by Campaign)
- `GoogleAdsChart.tsx` — ComposedChart (Spend bars + Revenue bars + ROAS line, dual Y-axes)
- `MetricCard.tsx` — `font-extrabold font-mono`, sentiment-aware change indicators, `MetricGrid` wrapper
- `SummaryStats.tsx` — 4-card secondary metrics grid (CTR, CPC, Impressions, Clicks)

### Implementation Steps

#### Step 1: Install Recharts
```bash
npm install recharts
```

#### Step 2: Create chart components

**`src/app/dashboard/components/charts/campaign-chart.tsx`**
(Ported from old `CampaignCharts.tsx`)
- Props: `campaigns: Array<{ name, spend, revenue, roas }>`
- Layout: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Chart 1: "Spend vs Revenue" — `<BarChart>` with dual `<Bar>` (spend + revenue)
  - X-axis: campaign names truncated 10 chars, rotated -35°
  - Y-axis: currency formatter (`$1K`, `$10K`)
  - Bar radius `[4,4,0,0]`, fillOpacity 0.8
- Chart 2: "ROAS by Campaign" — single `<Bar>` with `×` formatter
- Height: 280-320px responsive
- Custom tooltip: `background: var(--bg-card)`, `border: 1px solid var(--border-primary)`

**`src/app/dashboard/components/charts/time-series-chart.tsx`**
(Ported from old `GoogleAdsChart.tsx`)
- Props: `timeSeries: Array<{ date, spend, revenue, roas }>`
- `<ComposedChart>`: Spend `<Bar>` + Revenue `<Bar>` + ROAS `<Line>`
- Left Y-axis: currency, Right Y-axis: ROAS `×`
- X-axis: dates formatted "Jan 15", `interval="preserveStartEnd"`
- ROAS line: strokeWidth 2, dot markers r=3
- Height: 288px (sm) / 320px (md+)

#### Step 3: Redesign MetaView

**KPI layout** — 4 primary large + 4 secondary small:
```
[  Spend (lg)  ] [ Revenue (lg) ] [  ROAS (lg)  ] [ Purchases (lg) ]
[ Impr. (sm)   ] [ Clicks (sm)  ] [  CTR (sm)   ] [   CPC (sm)     ]
```
- Primary: `grid-cols-2 md:grid-cols-4`, values `text-2xl md:text-3xl font-extrabold font-mono`
- Secondary: `grid-cols-2 md:grid-cols-4`, smaller text
- All with comparison badges (sentiment-aware: CPA decrease = green)

**Campaign charts** — Between KPIs and table (if ≥2 campaigns)

**Campaign table** — Enhanced columns:
```
Campaign | Spend | Revenue* | ROAS* | Impr. | Clicks | CTR | CPC | Purchases | CPA
```
- Revenue: `font-semibold` accent color
- ROAS: color-coded (green ≥2×, amber 1-2×, red <1×)

**Time-series chart** — Daily performance if data exists

**Creative cards** — Full port from old `CreativeGrid.tsx`:
- Summary metrics above: Total Spend, Revenue, Purchases, Clicks (4-card grid)
- Card grid: `grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Image: `aspectRatio: '4/5'`, `object-cover`, lazy loading
- Video overlay: ▶ button in blurred circle (`rgba(0,0,0,0.55)`, `backdrop-blur(4px)`)
- CTA badge: bottom-left, dark background, uppercase tracking
- Metrics: 2×4 grid (Spend, ROAS, CTR, CVR, TSR, Purchases, Clicks, CPM)
- ROAS progress bar: proportional width, green if ≥2.0×, red otherwise
- Image proxy via `/api/image-proxy?url=` for Facebook images

**Data shape additions**: `revenue`, `timeSeries`, `creatives` with `video_id`, `cta`, `cvr`, `tsr`, `cpm`, `thumbnail`

#### Step 4: Redesign GoogleView
Same 4+4 KPI layout. Time-series ComposedChart as primary visual (matching old `GoogleAdsChart`). Enhanced campaign table.

#### Step 5: Enhance ShopifyView
Daily Revenue/Orders composed chart replacing placeholder. Keep product table + existing KPIs.

#### Step 6: Blended view on Overview page
Port MER section concept to the Overview page (client-scoped, not blended across clients):
- For each client card, show 4 big metrics: MER (spend÷revenue %), ROAS (×), Revenue ($), Ad Spend ($)
- Platform status indicators below: "Meta: $X spend", "Google: $X spend", "Shopify: X orders"
- Fonts: `text-2xl font-extrabold font-mono`, MER with gradient text
- Each metric has comparison change indicator

#### Step 7: Update MetricCard
- Add `metricType` prop: `'revenue' | 'spend' | 'roas' | 'purchases' | 'ctr' | 'cpc' | 'cpm' | 'cpa' | 'neutral'`
- Sentiment logic: revenue/roas/purchases increase = green, cpc/cpa/cpm increase = red, spend/impressions = neutral
- Font: add `font-mono` for values, `font-extrabold`
- Change display: `▲`/`▼`/`—` + percentage + "vs prev" (matching old dashboard)
- Colors: `text-emerald-600` positive, `text-red-500` negative

#### Step 8: Pass timeSeries + revenue through transforms

**Platform pages** (meta/google/shopify page.tsx):
```ts
revenue: s.metrics?.revenue ?? 0,
timeSeries: (s.timeSeries ?? []).map(ts => ({
  date: ts.date, spend: ts.metrics.spend,
  revenue: ts.metrics.revenue, roas: ts.metrics.roas,
})),
```

**Client detail page**: Same in all transform functions.

#### Step 9: Image proxy API route
**`src/app/api/image-proxy/route.ts`**
- `GET ?url=...` — validates domain is Facebook (`fbcdn.net`, `facebook.com`)
- Fetches image server-side, streams response back with correct content-type
- Prevents CORS/403 issues with Facebook ad creative thumbnails

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/dashboard/components/charts/campaign-chart.tsx` | Spend vs Revenue + ROAS bar charts |
| `src/app/dashboard/components/charts/time-series-chart.tsx` | Daily composed chart |
| `src/app/api/image-proxy/route.ts` | Facebook image CORS proxy |

### Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `recharts` |
| `src/app/dashboard/components/meta-view.tsx` | Full redesign: 4+4 KPIs, charts, creative cards, enhanced table |
| `src/app/dashboard/components/google-view.tsx` | Full redesign: 4+4 KPIs, time-series chart, enhanced table |
| `src/app/dashboard/components/shopify-view.tsx` | Revenue chart, keep products |
| `src/app/dashboard/components/metric-card.tsx` | `metricType`, font-mono, sentiment-aware changes |
| `src/app/dashboard/meta/page.tsx` | Pass revenue + timeSeries + creatives in transform |
| `src/app/dashboard/google/page.tsx` | Pass revenue + timeSeries |
| `src/app/dashboard/shopify/page.tsx` | Pass timeSeries |
| `src/app/dashboard/clients/[id]/page.tsx` | Same transforms |
| `src/app/dashboard/page.tsx` | Enhance client cards with MER-style metrics |

### NOT changing
- Connectors — already return timeSeries, breakdowns, campaigns, revenue
- analytics.ts, API routes — data pipeline stays
- Sidebar, routing, client-scoped model

### Verification
1. `npx next build` passes
2. Meta: 4 large KPIs + 4 small + campaign bar charts + time-series + creative cards + enhanced table
3. Google: time-series ComposedChart as hero visual + enhanced table
4. Shopify: revenue chart replaces placeholder
5. Creative cards: 4:5 images, ROAS color coding, progress bar, video overlay
6. Charts use Prism theme CSS vars
7. ROAS color-coded in tables (green/amber/red)
8. Comparison badges sentiment-aware (CPA decrease = green)
9. Overview client cards show MER-style big metrics + platform status

---

## Phase 7: Client Management, Data Source Limits, Channel Enforcement, Loading States

### Context
User has 100+ ad accounts but the API caps at 100 per page and the UI requests only 25, making some accounts unfindable. Clients can't be edited or deleted. Data sources can't be unassigned/reassigned from the client detail page. No enforcement prevents assigning multiple Meta (or Google) accounts to one client. Loading states show plain "Loading..." text instead of polished animations.

### 7A: Client CRUD — Edit Names, Delete Clients

**Create `src/app/api/clients/[id]/route.ts`** (new dynamic route):
- **PATCH** `{ name: string }` — rename client
  - Validate: non-empty name, client belongs to user's org
  - `prisma.client.update({ where: { id }, data: { name } })`
  - Return: `{ client: { id, name } }`
- **DELETE** — remove client
  - Validate: client belongs to user's org
  - Before delete: `prisma.adAccount.updateMany({ where: { clientId: id }, data: { clientId: null } })` — unassign all data sources (don't delete them)
  - `prisma.client.delete({ where: { id } })`
  - Return: `{ deleted: true }`

**Modify `src/app/dashboard/clients/page.tsx`**:
- Add edit icon per card → inline editable name (click to edit, Enter to save, Escape to cancel)
- Add delete button per card → confirmation modal: "Delete {name}? X data sources will be unassigned."
- Calls PATCH/DELETE `/api/clients/[id]`
- Refresh list after mutation

**Modify `src/app/dashboard/clients/[id]/page.tsx`**:
- Editable client name in header (same inline edit pattern)
- Delete button with confirmation → redirects to `/dashboard/clients` after delete

### 7B: Data Source Unassign/Reassign from Client Detail

**Modify `src/app/dashboard/clients/[id]/page.tsx`**:
- In "Assigned Data Sources" section, add per-row actions:
  - "Unassign" button → calls PATCH `/api/data-sources` with `clientId: null`
  - "Reassign" dropdown → shows other clients → calls PATCH with new clientId
- After mutation: refresh client data + analytics
- Show confirmation for unassign: "Remove {account name} from this client?"

### 7C: Remove 100-Account API Cap

**Modify `src/app/api/data-sources/route.ts`**:
- Change `Math.min(100, ...)` → `Math.min(500, ...)` (raise max to 500)
- Keep default at 25

**Modify `src/app/dashboard/data-sources/page.tsx`**:
- Add page size selector: `[25, 50, 100]` options
- Show total count prominently: "Showing 1-25 of 312 data sources"
- Keep existing pagination (prev/next buttons)

### 7D: One Marketing Channel Per Client Enforcement

**Business rule**: Each client can have at most ONE Meta account and ONE Google account assigned. Shopify same rule — one store per client.

**Modify `src/app/api/data-sources/route.ts` PATCH handler**:
- Before assigning, check if client already has an account on this platform:
  ```ts
  if (clientId) {
    const existing = await db.adAccount.findFirst({
      where: { clientId, platform: adAccount.platform, id: { not: dataSourceId } },
    });
    if (existing) {
      return NextResponse.json({
        error: `This client already has a ${platform} account assigned (${existing.name}). Unassign it first.`,
        code: "CHANNEL_LIMIT",
        existingAccount: { id: existing.id, name: existing.name },
      }, { status: 409 });
    }
  }
  ```

**Modify `src/app/api/data-sources/bulk-assign/route.ts`**:
- Same check per platform: group selected sources by platform, check counts
- Return 409 if any platform would exceed 1 per client

**Modify `src/app/dashboard/data-sources/page.tsx`**:
- Handle 409 response: show toast/banner with error message
- In assign dropdown: append "(has Meta)" or "(has Google)" label next to clients that already have an account on this data source's platform

### 7E: Beautiful Loading Animations

**Create `src/app/dashboard/components/loading-skeleton.tsx`** (new):
- `AnalyticsSkeleton` — shimmer skeleton matching the analytics layout:
  - 4 large metric card placeholders (shimmer rectangles matching MetricCard dimensions)
  - 4 small metric card placeholders
  - Chart placeholder (rounded rectangle with shimmer, ~320px tall)
  - Table placeholder (header bar + 5 shimmer rows)
- Uses existing `.shimmer` class from `globals.css` (already defined but unused)
- Props: `variant: "meta" | "google" | "shopify" | "overview"` to adjust grid column counts
- All colors use CSS vars: `var(--bg-secondary)`, `var(--bg-tertiary)` for shimmer gradient

**Modify all platform pages** (`meta/page.tsx`, `google/page.tsx`, `shopify/page.tsx`):
- Replace `"Loading..."` text with `<AnalyticsSkeleton variant="meta" />` etc.
- Show skeleton during initial load AND when switching clients
- Content uses `animate-fade-in` class when appearing

**Modify `src/app/dashboard/clients/[id]/page.tsx`**:
- Replace `"Loading analytics..."` with `<AnalyticsSkeleton />`
- Replace initial "Loading..." with client header skeleton

**Modify `src/app/dashboard/page.tsx`** (Overview):
- Show 2-4 shimmer client card skeletons while loading

### Files Summary

| Action | File | Notes |
|--------|------|-------|
| CREATE | `src/app/api/clients/[id]/route.ts` | PATCH (rename) + DELETE client |
| CREATE | `src/app/dashboard/components/loading-skeleton.tsx` | Shimmer skeletons for all pages |
| MODIFY | `src/app/api/data-sources/route.ts` | Raise limit 100→500, enforce one-channel-per-client in PATCH |
| MODIFY | `src/app/api/data-sources/bulk-assign/route.ts` | Enforce one-channel-per-client |
| MODIFY | `src/app/dashboard/clients/page.tsx` | Inline edit name, delete with confirmation |
| MODIFY | `src/app/dashboard/clients/[id]/page.tsx` | Editable name, delete, unassign/reassign data sources, skeleton loading |
| MODIFY | `src/app/dashboard/data-sources/page.tsx` | Page size selector, handle 409 channel limit, show "(has Meta)" in dropdowns |
| MODIFY | `src/app/dashboard/meta/page.tsx` | Replace "Loading..." with AnalyticsSkeleton |
| MODIFY | `src/app/dashboard/google/page.tsx` | Same |
| MODIFY | `src/app/dashboard/shopify/page.tsx` | Same |
| MODIFY | `src/app/dashboard/page.tsx` | Overview loading skeleton |

### Verification
1. `npx next build` passes
2. Can rename a client from both clients list and client detail page
3. Can delete a client — data sources become unassigned (not deleted)
4. Can unassign/reassign data sources from client detail page
5. Data sources page shows all 100+ accounts with pagination (25/50/100 per page)
6. Assigning a second Meta account to a client returns 409 error with message
7. All analytics pages show shimmer skeleton during loading (no plain "Loading..." text)
8. Skeleton matches the layout shape of the actual content
9. Dark mode: skeletons use CSS vars, no hardcoded colors
