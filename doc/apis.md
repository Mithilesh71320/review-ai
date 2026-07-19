# API Reference

All routes are Next.js App Router handlers under `src/app/api/`.

**Auth:** Almost every route calls `auth()` from `@clerk/nextjs/server` and returns `401` if no `userId`. Middleware in `src/proxy.ts` also protects these paths with `auth.protect()`.

**Logging:** Most handlers wrap the handler with `withApiLogger` from `src/lib/api-logger.ts`.

**Business logic:** Delegated to `reviewMonitoringService` (`src/server/services/review-monitoring.service.ts`).

**Common query param:**

| Param | Type | Description |
|-------|------|-------------|
| `managedBusinessId` | string (optional) | Scope data to a `ManagedBusiness` row. When omitted, service resolves a default selected business. |

---

## Auth & protection

### Middleware (`src/proxy.ts`)

Protected API matchers:

```
/api/settings(.*)
/api/dashboard(.*)
/api/reviews(.*)
/api/alerts(.*)
/api/insights(.*)
/api/fetch-reviews(.*)
/api/google(.*)
```

Unauthenticated browser/API hits to these routes are blocked by Clerk before the handler (or return 401 inside the handler).

### Error shape

Most errors:

```json
{ "error": "Human-readable message" }
```

Success payloads vary by route (see below).

### Subscription gating

Several routes call `resolveSubscriptionAccessForUser` (`src/lib/billing-access.ts`):

| Guard | Used by | Meaning |
|-------|---------|---------|
| Paid plan required | `POST /api/fetch-reviews` | `assertPaidPlan` |
| AI replies | `POST /api/reviews/reply` | `assertAiReplies` (plan capability) |
| Advanced AI | `GET /api/insights` | `assertAdvancedAi` |
| Business limits | `PUT /api/settings` | Max managed businesses per plan |

Plans: **starter** | **growth** | **pro** (resolved via Clerk `has({ plan })` / billing subscription).

---

## Endpoint index

| Method | Path | Auth | Paid / capability | Description |
|--------|------|------|-------------------|-------------|
| `GET` | `/api/dashboard` | Yes | — | Dashboard stats & charts |
| `GET` | `/api/reviews` | Yes | — | List reviews |
| `POST` | `/api/reviews/reply` | Yes | AI responses | Draft or post reply |
| `GET` | `/api/alerts` | Yes | — | Alerts + rules |
| `PATCH` | `/api/alerts` | Yes | — | Mark read / toggle rule |
| `GET` | `/api/insights` | Yes | Advanced AI | Prescriptive AI insights |
| `POST` | `/api/fetch-reviews` | Yes | Paid plan | Sync Google reviews |
| `GET` | `/api/settings` | Yes | — | Load settings + subscription |
| `PUT` | `/api/settings` | Yes | Plan limits on businesses | Save settings |
| `GET` | `/api/google/oauth/start` | Yes | — | Google OAuth URL |
| `GET` | `/api/google/oauth/callback` | Yes | — | OAuth code exchange |
| `GET` | `/api/google/businesses` | Yes | — | List GBP locations |
| `GET` | `/api/google/places/search` | Yes | — | Text Places API |

---

## `GET /api/dashboard`

**File:** `src/app/api/dashboard/route.ts`

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `managedBusinessId` | No | Filter to one managed business |

### Response `200`

```ts
{
  stats: {
    averageRating: number;      // 1 decimal
    totalReviews: number;
    newToday: number;
    activeAlerts: number;       // unread
    monthlyDelta: number;       // averageRating - 4.5 (placeholder baseline)
    weeklyDelta: number;        // last 7d count - previous 7d count
    sentimentTodayText: string;
    activeAlertsText: string;
  };
  trend: Array<{ month: string; rating: number }>; // ~6 months
  sentiment: Array<{
    name: "Positive" | "Neutral" | "Negative";
    value: number;  // percent 0–100
    color: string;
  }>;
  recentReviews: Array<{
    id: string;
    text: string;
    rating: number;
    sentiment: string; // lowercase
    time: string;      // ISO
  }>;
  selectedBusinessId: string | null;
}
```

### Errors

| Status | Body |
|--------|------|
| `401` | `{ error: "Unauthorized" }` |

---

## `GET /api/reviews`

**File:** `src/app/api/reviews/route.ts`

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `managedBusinessId` | No | Scope reviews |

### Response `200`

```ts
{
  reviews: Array<{
    id: string;
    author: string;
    text: string;
    rating: number;
    sentiment: string;          // positive | neutral | negative
    tags: string[];             // from classifyReview
    urgency: "critical_at_risk" | "constructive" | "gratitude";
    source: string;             // pretty-printed enum e.g. "Google"
    createdAt: string;          // ISO
    canReply: boolean;          // true if reviewResourceName present
    reply: string | null;
    repliedAt: string | null;
  }>;
  selectedBusinessId: string | null;
}
```

### Errors

| Status | Body |
|--------|------|
| `401` | `{ error: "Unauthorized" }` |

---

## `POST /api/reviews/reply`

**File:** `src/app/api/reviews/reply/route.ts`

Requires plan capability **`aiResponses`**.

### Body (discriminated by `action`)

#### Draft

```json
{
  "action": "draft",
  "reviewId": "<uuid>"
}
```

**Response `200`:** AI draft (from `generateReviewReply`):

```ts
{
  reply: string;
  tone?: string;
  confidence?: "high" | "medium" | "low";
}
```

#### Post

```json
{
  "action": "post",
  "reviewId": "<uuid>",
  "reply": "Thank you for your feedback..."
}
```

**Response `200`:**

```ts
{
  ok: true;
  repliedAt: string; // ISO
}
```

Posts to Google Business Profile:

```
PUT https://mybusiness.googleapis.com/v4/{reviewResourceName}/reply
```

### Errors

| Status | Typical message |
|--------|-----------------|
| `401` | Unauthorized |
| `400` | Invalid action; review not found; AI not allowed; Google not connected; not owner/manager (403 from Google mapped to message); review not from GBP |

---

## `GET /api/alerts`

**File:** `src/app/api/alerts/route.ts`

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `managedBusinessId` | No | Scope alerts |

### Response `200`

```ts
{
  unreadCount: number;
  alerts: Array<{
    id: string;
    type: string;       // lowercase enum
    title: string;
    description: string;
    severity: string;   // high | medium | low
    read: boolean;
    createdAt: string;
  }>;
  rules: Array<{
    id: string;
    type: "NEGATIVE_REVIEW" | "RATING_DROP" | "TREND" | "POSITIVE_SPIKE";
    name: string;
    description: string;
    enabled: boolean;
  }>;
  selectedBusinessId: string | null;
}
```

---

## `PATCH /api/alerts`

**File:** `src/app/api/alerts/route.ts`

### Body

#### Mark all read

```json
{
  "action": "markAllRead",
  "managedBusinessId": "<optional uuid>"
}
```

#### Toggle rule

```json
{
  "action": "toggleRule",
  "type": "NEGATIVE_REVIEW",
  "enabled": true
}
```

`type` must be a Prisma `AlertType` enum value.

### Response `200`

```json
{ "ok": true }
```

### Errors

| Status | Body |
|--------|------|
| `401` | Unauthorized |
| `400` | `{ error: "Invalid action" }` |

---

## `GET /api/insights`

**File:** `src/app/api/insights/route.ts`

Requires plan capability **`advancedAiRecommendations`** (Growth/Pro).

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `managedBusinessId` | No | Scope reviews used for analysis |

### Behavior

- Loads up to **20** reviews for the business.
- Classifies tags client-side in service via `classifyReview`.
- Calls `generateReviewInsights` (Gemini / `@google/genai`) with business name + optional business context.

### Response `200`

Shape expected by Reviews page:

```ts
{
  improvedOrChanged: string[];
  remainSame: string[];
  recommendedActions: Array<{
    action: string;
    evidence: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }>;
}
```

### Errors

| Status | Typical message |
|--------|-----------------|
| `401` | Unauthorized |
| `400` | No paid advanced AI; no reviews available; generation failure |

---

## `POST /api/fetch-reviews`

**File:** `src/app/api/fetch-reviews/route.ts`

Requires **paid plan**.

### Body

```ts
{
  managedBusinessId?: string;
  placeId?: string;
  businessName?: string;
}
```

### Behavior (service)

1. Assert paid plan.
2. Prefer Google Business Profile reviews when `locationName` + OAuth token exist.
3. Else resolve `placeId` (or search by `businessName`) and pull via Places API.
4. Store/upsert reviews; run sentiment/tagging; respect **max stored reviews** plan limit.
5. May create alerts from new negative reviews / rating patterns.

### Response `200` (typical)

```ts
{
  storedCount: number;
  reviewLimitReached?: boolean;
  reviewLimit?: number | null;
  // additional fields may be returned by service
}
```

### Errors

| Status | Typical message |
|--------|-----------------|
| `401` | Unauthorized |
| `400` | No paid plan; missing placeId/businessName; Places/GBP failures |

---

## `GET /api/settings`

**File:** `src/app/api/settings/route.ts`

### Response `200`

```ts
{
  business: {
    name: string;
    email: string;
    phone: string;
    website: string;
    placeId: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    weeklyDigest: boolean;
  };
  ai: {
    provider: string;          // default "gemini"
    sentimentModel: string;    // default "balanced"
    analysisLanguage: string;  // default "en"
    autoRespond: boolean;
    businessContext: string;
  };
  sources: Array<{
    source: string;            // pretty name
    key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR";
    connected: boolean;
  }>;
  businesses: Array<{
    id: string;
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }>;
  subscription: {
    planKey: "starter" | "growth" | "pro" | null;
    planName: string | null;
    hasPaidPlan: boolean;
    limits: {
      maxBusinesses: number | null;
      maxStoredReviews: number | null;
    };
    capabilities: {
      aiResponses: boolean;
      advancedAiRecommendations: boolean;
      businessContext: boolean;
      reviewNotifications: boolean;
      dedicatedSupport: boolean;
    };
    usage: {
      businesses: number;
      storedReviews: number;
    };
  };
}
```

Notes:

- Workspace is **auto-created** per Clerk `userId` via `ensureWorkspace`.
- `subscription` comes from Clerk plan resolution, not the database.

---

## `PUT /api/settings`

**File:** `src/app/api/settings/route.ts`

### Body

```ts
{
  business: {
    name: string;
    email: string;
    phone: string;
    website: string;
    placeId: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    weeklyDigest: boolean;
  };
  ai: {
    provider: string;
    sentimentModel: string;
    analysisLanguage: string;
    autoRespond: boolean;
    businessContext?: string;
  };
  sources: Array<{ key: ReviewSource; connected: boolean }>;
  businesses: Array<{
    id?: string;
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }>;
}
```

### Behavior

- Trims/filters businesses (requires non-empty `name` + `placeId`).
- Enforces **max businesses** for the plan.
- Updates `Business`, `BusinessSettings`, `SourceConnection`, upserts `ManagedBusiness` rows.

### Response `200`

```json
{ "ok": true }
```

### Errors

| Status | Typical message |
|--------|-----------------|
| `401` | Unauthorized |
| `400` | Business limit exceeded; other validation errors |

---

## Google APIs

### `GET /api/google/oauth/start`

**File:** `src/app/api/google/oauth/start/route.ts`

### Env required

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_REDIRECT_URI`

### Scopes

```
openid
email
profile
https://www.googleapis.com/auth/business.manage
```

### Response `200`

```json
{ "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

Uses `access_type=offline` and `prompt=consent` (refresh token).

### Errors

| Status | Body |
|--------|------|
| `401` | Unauthorized |
| `500` | Missing OAuth env config |

---

### `GET /api/google/oauth/callback`

**File:** `src/app/api/google/oauth/callback/route.ts`

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Authorization code from Google |

### Env required

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

### Behavior

1. Exchange code at `https://oauth2.googleapis.com/token`.
2. Persist tokens via `connectGoogleTokens` (SourceConnection for GOOGLE).
3. **Redirect** browser to `/settings?google=connected`.

### Errors

| Status | Body |
|--------|------|
| `401` | Unauthorized |
| `400` | Missing code / token exchange failed |
| `500` | Missing env |

---

### `GET /api/google/businesses`

**File:** `src/app/api/google/businesses/route.ts`

Lists Google Business Profile accounts/locations for the connected user.

### Response `200`

```ts
{
  connected: boolean;
  businesses: Array<{
    accountName: string;
    locationName: string;   // resource name for GBP APIs
    title: string;
    placeId: string | null;
    address: string | null;
    mapsUri: string | null;
  }>;
}
```

If no valid token: `{ connected: false, businesses: [] }`.

### Upstream Google APIs

- Account Management: `GET .../v1/accounts`
- Business Information: `GET .../v1/{account}/locations?readMask=...`

### Errors

| Status | Body |
|--------|------|
| `401` | Unauthorized |
| `500` | `{ error: "Failed to load Google businesses." }` or message |

---

### `GET /api/google/places/search`

**File:** `src/app/api/google/places/search/route.ts`

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `query` | No (empty → empty list) | Text search text |

### Env required

- `GOOGLE_PLACES_API_KEY`

### Response `200`

```ts
{
  places: Array<{
    placeId: string;
    name: string;
    address: string | null;
    rating: number | null;
    userRatingCount: number | null;
  }>;
}
```

Upstream: Places API (New) `places:searchText`, `pageSize: 8`.

### Errors

| Status | Body |
|--------|------|
| `401` | Unauthorized |
| `4xx/5xx` | Propagates Google status when available; message in `error` |

---

## Client helpers

### `fetchJson` — `src/lib/api.ts`

```ts
async function fetchJson<T>(input, init?): Promise<T>
```

- Throws `Error` with server `error` message when `!response.ok`.

### React Query keys — `src/lib/query-keys.ts`

```ts
queryKeys.dashboard(managedBusinessId)
queryKeys.reviews(managedBusinessId)
queryKeys.alerts(managedBusinessId)
queryKeys.insights(managedBusinessId)
queryKeys.settings
queryKeys.googleBusinesses
queryKeys.googlePlaceSearch(query)
```

---

## Environment variables (API-related)

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | Prisma |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth start/callback |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth callback |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth start/callback |
| `GOOGLE_PLACES_API_KEY` | Places search + review fetch |
| Clerk env vars | Auth + billing (standard Clerk setup) |
| Gemini / Google GenAI key | AI insights & reply draft (via `src/lib/ai.ts`) |

---

## Service layer map

| API | Service method |
|-----|----------------|
| `GET /api/dashboard` | `getDashboard` |
| `GET /api/reviews` | `getReviews` |
| `POST /api/reviews/reply` draft | `draftReviewReply` |
| `POST /api/reviews/reply` post | `postReviewReply` |
| `GET /api/alerts` | `getAlerts` |
| `PATCH` markAllRead | `markAllAlertsRead` |
| `PATCH` toggleRule | `updateAlertRule` |
| `GET /api/insights` | `getReviewInsights` |
| `POST /api/fetch-reviews` | `fetchLatestReviewsForBusiness` |
| `GET /api/settings` | `getSettings` |
| `PUT /api/settings` | `updateSettings` |
| OAuth callback | `connectGoogleTokens` |
| `GET /api/google/businesses` | `listGoogleBusinesses` |
| `GET /api/google/places/search` | `searchGooglePlaces` |
