-- AlterTable
ALTER TABLE "Review" ADD COLUMN "sentimentConfidence" DOUBLE PRECISION;
ALTER TABLE "Review" ADD COLUMN "sentimentReason" TEXT;
ALTER TABLE "Review" ADD COLUMN "reviewTags" JSONB;

-- CreateIndex
CREATE INDEX "Review_managedBusinessId_createdAt_idx" ON "Review"("managedBusinessId", "createdAt" DESC);
