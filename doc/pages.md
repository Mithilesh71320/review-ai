# Pages Reference

All UI routes live under `src/app/` (Next.js App Router).

Authentication: **Clerk**. Protected dashboard routes use the layout group `(dashboard)` and are gated by middleware in `src/proxy.ts`.

---

## Route overview

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `/` | `src/app/page.tsx` | Public | Marketing landing page |
| `/sign-in/[[...sign-in]]` | `src/app/sign-in/[[...sign-in]]/page.tsx` | Public | Clerk sign-in |
| `/sign-up/[[...sign-up]]` | `src/app/sign-up/[[...sign-up]]/page.tsx` | Public | Clerk sign-up |
| `/sign-out` | `src/app/sign-out/page.tsx` | Public (UI branches) | Confirm / complete sign-out |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Protected | Reputation overview |
| `/reviews` | `src/app/(dashboard)/reviews/page.tsx` | Protected | Review inbox + AI insights + replies |
| `/alerts` | `src/app/(dashboard)/alerts/page.tsx` | Protected | Alert feed + rules |
| `/billing` | `src/app/(dashboard)/billing/page.tsx` | Protected | Clerk pricing / plans |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | Protected | Profile, businesses, Google, AI, billing tab |

---

## Layouts

### Root layout — `src/app/layout.tsx`

- Wraps the app in `ClerkProvider` (dark theme from `@clerk/ui/themes`).
- Provides `AppQueryProvider` (TanStack React Query).
- Loads global CSS and Geist fonts.

### Dashboard layout — `src/app/(dashboard)/layout.tsx`

Used by all authenticated app pages under `(dashboard)`.

**Chrome:**

- `AppSidebar` — nav: Dashboard, Reviews, Alerts, Billing, Settings
- Header with `DashboardHeaderControls`
- `DashboardPrefetcher` — warm React Query caches
- Main content area (`bg-[#F8F6F1]`)

**Protected by middleware:**

```
/dashboard, /reviews, /alerts, /billing, /settings
```

---

## Public pages

### `/` — Landing (Home)

**File:** `src/app/page.tsx`  
**Type:** Server component  
**APIs:** none

Marketing site for ReviewAI (positioned for salons & spas).

**Sections:**

- Sticky nav → Features, Pricing, About anchors
- Hero CTA → `/sign-up`, Sign In → `/dashboard`
- Problem cards (scattered reviews, no time to respond, pattern spotting)
- Features block
- Pricing via `BillingPlanCards` (`getBillingPlans()` from `src/lib/billing-plans.ts`)
- Footer

---

### `/sign-in/[[...sign-in]]`

**File:** `src/app/sign-in/[[...sign-in]]/page.tsx`  
**Type:** Server component  
**Component:** Clerk `<SignIn />` centered on dark background

Catch-all route for Clerk multi-step sign-in flows.

---

### `/sign-up/[[...sign-up]]`

**File:** `src/app/sign-up/[[...sign-up]]/page.tsx`  
**Type:** Server component  
**Component:** Clerk `<SignUp />` centered on dark background

---

### `/sign-out`

**File:** `src/app/sign-out/page.tsx`  
**Type:** Client component

| State | UI |
|-------|----|
| Signed in | Confirm dialog; `SignOutButton` → `/`; Cancel → `/dashboard` |
| Signed out | Message + link to `/sign-in` |

Uses Clerk `<Show when="signed-in|signed-out">`.

---

## Protected app pages

Common patterns across dashboard pages:

1. Load `/api/settings` for business list + subscription flags.
2. Select a **managed business** (`managedBusinessId`); default = first business.
3. Scope list/dashboard data with `?managedBusinessId=...`.
4. Paid features (sync reviews, AI) check `subscription.hasPaidPlan` / capabilities.
5. Data loading via **TanStack React Query** + `fetchJson` (`src/lib/api.ts`).

---

### `/dashboard`

**File:** `src/app/(dashboard)/dashboard/page.tsx`  
**Type:** Client component

#### Purpose

High-level reputation dashboard for one managed business.

#### APIs used

| Method | Endpoint | When |
|--------|----------|------|
| `GET` | `/api/settings` | Business list + plan |
| `GET` | `/api/dashboard?managedBusinessId=` | Stats, charts, recent reviews |
| `POST` | `/api/fetch-reviews` | Manual refresh (paid only) |

#### UI features

- Business selector
- Stats cards: average rating, total reviews, new today, active alerts, deltas
- 6-month rating trend (Recharts area chart)
- Sentiment pie chart (positive / neutral / negative %)
- Recent reviews list (rating + sentiment badges)
- Refresh button → sync Google reviews then invalidate dashboard/reviews/alerts queries
- Skeleton while loading; empty/error states when no data

#### Query keys

- `queryKeys.settings`
- `queryKeys.dashboard(managedBusinessId)`

---

### `/reviews`

**File:** `src/app/(dashboard)/reviews/page.tsx`  
**Type:** Client component

#### Purpose

Full review inbox: search/filter, sync, AI insights (prescriptive analysis), AI draft/post replies.

#### APIs used

| Method | Endpoint | When |
|--------|----------|------|
| `GET` | `/api/settings` | Businesses, plan, AI capabilities |
| `GET` | `/api/reviews?managedBusinessId=` | Review list |
| `GET` | `/api/insights?managedBusinessId=` | AI insights (if advanced AI enabled) |
| `POST` | `/api/fetch-reviews` | Sync / auto-sync on business change |
| `POST` | `/api/reviews/reply` | `action: "draft"` or `action: "post"` |

#### UI features

- Business selector
- Search by author/text
- Filters: sentiment / tags / urgency, source
- Review cards: author, stars, sentiment badge, tags, urgency, reply status
- **AI Insights** panel (Growth/Pro capability `advancedAiRecommendations`):
  - What to improve/change
  - What to keep
  - Recommended actions (impact × effort)
- **AI reply workflow** (capability `aiResponses`):
  - Generate draft → show draft text
  - Post or Regenerate
  - Post uses Google Business Profile reply API (owner/manager only)
- Auto-sync when selected business changes (if paid + place/name present)
- Toast-style messages for sync/draft/post outcomes

#### Client filters

Applied in-memory after fetch:

- Text string on author + text
- Sentiment filter also matches tags and urgency labels
- Source filter (Google, etc.)

#### Query keys

- `queryKeys.settings`
- `queryKeys.reviews(managedBusinessId)`
- `queryKeys.insights(managedBusinessId)`

---

### `/alerts`

**File:** `src/app/(dashboard)/alerts/page.tsx`  
**Type:** Client component

#### Purpose

Unread alerts for a managed business + toggleable alert rules.

#### APIs used

| Method | Endpoint | When |
|--------|----------|------|
| `GET` | `/api/settings` | Business list + plan |
| `GET` | `/api/alerts?managedBusinessId=` | Alerts + rules |
| `PATCH` | `/api/alerts` | `markAllRead` or `toggleRule` |
| `POST` | `/api/fetch-reviews` | Optional sync refresh |

#### UI features

- Business selector
- Unread count
- Alert list (type icons, severity colors, title/description/time)
- **Mark all as read**
- Alert rules with switches:
  - `NEGATIVE_REVIEW`
  - `RATING_DROP`
  - `TREND`
  - `POSITIVE_SPIKE`
- Refresh / re-sync reviews (paid)

#### Query keys

- `queryKeys.settings`
- `queryKeys.alerts(managedBusinessId)`

---

### `/billing`

**File:** `src/app/(dashboard)/billing/page.tsx`  
**Type:** Client component

#### Purpose

Subscription checkout and plan marketing. **No free plan** in app config; paid plans only.

#### APIs used

None directly. Clerk Billing handles checkout.

#### UI features

- Query param `returnTo` (default `/dashboard`) for back link + post-checkout redirect
- Info cards: paid checkout, plan limits, Clerk as source of truth
- Live **Clerk `<PricingTable />`** (`newSubscriptionRedirectUrl={returnTo}`)
- Local fallback **BillingPlanCards** (Starter / Growth / Pro copy from `billing-plans.ts`)

#### Plans (local config)

| Plan | Price | Businesses | Stored reviews | Highlights |
|------|-------|------------|----------------|------------|
| Starter | $19/mo | 2 | 100 | AI responses, notifications |
| Growth | $29/mo | 5 | 500 | Advanced AI recommendations |
| Pro | $49/mo | Unlimited | Unlimited | Business context for AI, dedicated support |

---

### `/settings`

**File:** `src/app/(dashboard)/settings/page.tsx`  
**Type:** Client component

#### Purpose

Workspace configuration: profile, multi-business list, Google OAuth, notifications, AI, billing overview.

#### Tabs

| Tab ID | Label | Contents |
|--------|-------|----------|
| `profile` | Profile | Name, email, phone, website, placeId |
| `business` | Business Profiles | Managed business list; add via Google locations or Places search |
| `connections` | Connections | Source connections (Google OAuth start) |
| `notifications` | Notifications | Email / push / SMS / weekly digest toggles |
| `ai` | AI Config | Provider, sentiment model, language, auto-respond, business context |
| `billing` | Billing | Plan usage/limits cards + link to `/billing` |

#### APIs used

| Method | Endpoint | When |
|--------|----------|------|
| `GET` | `/api/settings` | Load full settings payload |
| `PUT` | `/api/settings` | Save settings / businesses |
| `GET` | `/api/google/businesses` | List GBP locations when connected |
| `GET` | `/api/google/places/search?query=` | Search places (query ≥ 3 chars) |
| `GET` | `/api/google/oauth/start` | Start Google connect flow |

#### Business list UX notes

- Adding/removing businesses updates **local draft state** first (`selectionDirty`).
- Pending business list changes auto-persist (including `keepalive` on leave) so users are less likely to lose unsaved list edits.
- Explicit save mutation also `PUT`s full settings state.
- Business count enforced by plan (`assertBusinessLimit` server-side).

#### Google OAuth UX

1. User clicks connect → `GET /api/google/oauth/start` → browser navigates to `authUrl`.
2. Google redirects to `/api/google/oauth/callback`.
3. Tokens stored; redirect to `/settings?google=connected`.

#### Query keys

- `queryKeys.settings`
- `queryKeys.googleBusinesses`
- `queryKeys.googlePlaceSearch(query)`

---

## Navigation (sidebar)

**File:** `src/components/app-sidebar.tsx`

| Label | Path |
|-------|------|
| Dashboard | `/dashboard` |
| Reviews | `/reviews` |
| Alerts | `/alerts` |
| Billing | `/billing` (preserves `returnTo` when leaving other pages) |
| Settings | `/settings` |

Shows business name + current plan from `/api/settings`.

---

## Page → API dependency matrix

| Page | settings | dashboard | reviews | alerts | insights | fetch-reviews | reviews/reply | google/* |
|------|:--------:|:---------:|:-------:|:------:|:--------:|:-------------:|:-------------:|:--------:|
| Dashboard | ✓ | ✓ | | | | ✓ | | |
| Reviews | ✓ | | ✓ | | ✓ | ✓ | ✓ | |
| Alerts | ✓ | | | ✓ | | ✓ | | |
| Billing | | | | | | | | |
| Settings | ✓ | | | | | | | ✓ |
