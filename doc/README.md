# ReviewAI Documentation

Internal developer docs for the ReviewAI (review monitoring & analysis) Next.js app.

## Contents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | **Start here** — feature modules, server layers, team rules |
| [pages.md](./pages.md) | App Router pages, layouts, routes, and UI behavior |
| [apis.md](./apis.md) | REST API routes under `src/app/api/` |

## Quick map

```
Public pages:     /  /sign-in  /sign-up  /sign-out
Protected app:    /dashboard  /reviews  /alerts  /billing  /settings
API:              /api/*  (mostly Clerk-protected)
```

## Key source locations

| Area | Path |
|------|------|
| Pages | `src/app/` |
| API routes | `src/app/api/` |
| Business logic | `src/server/services/review-monitoring.service.ts` |
| DB access | `src/server/repositories/review-monitoring.repository.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Auth middleware | `src/proxy.ts` |
| Client fetch helper | `src/lib/api.ts` |
| React Query keys | `src/lib/query-keys.ts` |
| Billing plans | `src/lib/billing-plans.ts` |
| Subscription access | `src/lib/billing-access.ts` |
| AI helpers | `src/lib/ai.ts`, `src/lib/ai-schemas.ts` |
