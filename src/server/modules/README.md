# Server modules

Application logic currently lives in the facade:

`src/server/services/review-monitoring.service.ts`

Pure domain logic is under:

```
src/server/domain/
  formatting.ts
  review-classification.ts
  settings-payload.ts
  google/types.ts
```

Persistence:

```
src/server/repositories/review-monitoring.repository.ts
```

## Method ownership (service facade)

| Domain | Methods |
|--------|---------|
| Dashboard | `getDashboard` |
| Reviews | `getReviews`, `draftReviewReply`, `postReviewReply` |
| Sync | `fetchLatestReviewsForBusiness`, `ingestGoogleReviews` |
| Alerts | `getAlerts`, `markAllAlertsRead`, `updateAlertRule` |
| Settings | `getSettings`, `updateSettings` |
| Google | `connectGoogleTokens`, `getValidGoogleAccessToken`, `listGoogleBusinesses`, `searchGooglePlaces`, `resolvePlaceIdFromBusinessName` |
| Insights | `getReviewInsights` |

When a domain grows further, extract a dedicated `*.module.ts` here and keep the facade thin.
