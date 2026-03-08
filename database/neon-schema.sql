-- Review AI schema for Neon Postgres
-- Paste in Neon SQL Editor and run once.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Sentiment') THEN
    CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewSource') THEN
    CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'YELP', 'FACEBOOK', 'TRIPADVISOR');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertType') THEN
    CREATE TYPE "AlertType" AS ENUM ('NEGATIVE_REVIEW', 'RATING_DROP', 'TREND', 'POSITIVE_SPIKE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertSeverity') THEN
    CREATE TYPE "AlertSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Business" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "placeId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "author" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "sentiment" "Sentiment" NOT NULL,
  "source" "ReviewSource" NOT NULL,
  "externalRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "AlertType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SourceConnection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "source" "ReviewSource" NOT NULL,
  "connected" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("businessId", "source")
);

CREATE TABLE IF NOT EXISTS "AlertRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "AlertType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("businessId", "type")
);

CREATE TABLE IF NOT EXISTS "BusinessSettings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
  "pushNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
  "smsNotifications" BOOLEAN NOT NULL DEFAULT FALSE,
  "weeklyDigest" BOOLEAN NOT NULL DEFAULT TRUE,
  "autoRespond" BOOLEAN NOT NULL DEFAULT TRUE,
  "sentimentModel" TEXT NOT NULL DEFAULT 'balanced',
  "analysisLanguage" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_businessId_source_externalRef_key"
  ON "Review" ("businessId", "source", "externalRef");

CREATE INDEX IF NOT EXISTS "Review_businessId_createdAt_idx"
  ON "Review" ("businessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Alert_businessId_createdAt_idx"
  ON "Alert" ("businessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SourceConnection_businessId_idx"
  ON "SourceConnection" ("businessId");

CREATE INDEX IF NOT EXISTS "AlertRule_businessId_idx"
  ON "AlertRule" ("businessId");
