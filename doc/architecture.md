# Architecture (team guide)

ReviewAI is organized so **routes stay thin** and **business logic lives in named modules**.

## High-level layout

```
src/
  app/                     # Next.js routes ONLY (pages + API handlers)
    (dashboard)/*/page.tsx # re-exports feature views
    api/*/route.ts         # auth + call service + return JSON

  features/                # Frontend feature modules (UI + hooks + api clients)
    reviews/
    dashboard/
    alerts/
    settings/

  shared/                  # Cross-feature frontend building blocks
    types/
    hooks/
    components/

  server/                  # Backend application layer
    domain/                # Pure helpers, types, classification
    repositories/          # Prisma data access
    services/              # Application facade used by API routes
    modules/               # Future focused modules (see README)

  lib/                     # Infra utilities (api client, billing, ai, prisma, logger)
  components/              # App chrome + shadcn UI primitives
```

## Frontend rules

1. **`app/**/page.tsx` is a shell** — import a `*View` from `features/*` and render it.
2. **Feature hooks own data** — React Query, mutations, filters live in `features/*/hooks`.
3. **Feature components are presentational** — receive props or a single workspace hook.
4. **Shared hooks** (`shared/hooks`) are for patterns used by 2+ features:
   - `useWorkspaceSettingsQuery`
   - `useManagedBusinessSelection`
   - `useFetchReviewsMutation`
5. **Do not call `fetch` inside JSX.** Use `features/*/api.ts` or shared hooks.

### Example: Reviews

```
features/reviews/
  api.ts                         # HTTP helpers
  types.ts
  lib/filter-reviews.ts
  hooks/use-reviews-workspace.ts # all page state
  components/
    reviews-view.tsx             # page composition
    review-card.tsx
    review-filters.tsx
    insights-panel.tsx
  index.ts                       # public exports
```

Route:

```tsx
// app/(dashboard)/reviews/page.tsx
import { ReviewsView } from "@/features/reviews";
export default function ReviewsPage() {
  return <ReviewsView />;
}
```

## Backend rules

1. **API routes** authenticate, parse input, call `reviewMonitoringService`, return JSON.
2. **Service facade** (`server/services/review-monitoring.service.ts`) owns use-cases.
3. **Repository** owns Prisma queries only — no Google/AI calls.
4. **Domain** owns pure logic (classification, formatting, Google DTO types).
5. **Billing gates** live in `lib/billing-access.ts` and are asserted inside the service.

### Request flow

```
UI feature hook
  → fetchJson / feature api
  → app/api/*/route.ts
  → reviewMonitoringService.method()
  → repository / Google / AI
  → JSON response
```

## Where to put new code

| Change | Put it here |
|--------|-------------|
| New dashboard widget UI | `features/dashboard/components` |
| New reviews filter | `features/reviews/lib` + filters component |
| New API endpoint | `app/api/.../route.ts` + service method |
| Review tagging rules | `server/domain/review-classification.ts` |
| DB query | `server/repositories/...` |
| Plan limits | `lib/billing-plans.ts` + `billing-access.ts` |
| AI prompts | `lib/ai.ts` + `lib/ai-schemas.ts` |

## Anti-patterns (avoid)

- 500+ line `page.tsx` files with types, hooks, and JSX mixed together
- Duplicating business-selector / fetch-reviews logic across pages
- Calling Prisma from React components
- Putting Google OAuth details inside UI components
- Silent `await invalidateQueries` inside mutations that freeze buttons

## Related docs

- [APIs](./apis.md)
- [Pages](./pages.md)
- [Server modules notes](../src/server/modules/README.md)
