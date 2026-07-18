-- Performance indexes for dashboard / alerts / reviews filters
CREATE INDEX IF NOT EXISTS "Review_businessId_managedBusinessId_createdAt_idx"
  ON "Review"("businessId", "managedBusinessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Review_businessId_managedBusinessId_sentiment_idx"
  ON "Review"("businessId", "managedBusinessId", "sentiment");

CREATE INDEX IF NOT EXISTS "Alert_businessId_managedBusinessId_createdAt_idx"
  ON "Alert"("businessId", "managedBusinessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Alert_businessId_isRead_createdAt_idx"
  ON "Alert"("businessId", "isRead", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Alert_businessId_managedBusinessId_isRead_idx"
  ON "Alert"("businessId", "managedBusinessId", "isRead");
