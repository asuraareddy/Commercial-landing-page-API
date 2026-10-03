-- Multi-domain landing pages (additive, safe for existing data)
-- Existing pages keep domainId = NULL and continue to be served on the main app host.

-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN IF NOT EXISTS "domainId" TEXT;

-- Slugs are now unique per domain instead of globally
DROP INDEX IF EXISTS "LandingPage_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LandingPage_domainId_slug_key" ON "LandingPage"("domainId", "slug");
CREATE INDEX IF NOT EXISTS "LandingPage_slug_idx" ON "LandingPage"("slug");
CREATE INDEX IF NOT EXISTS "LandingPage_workspaceId_idx" ON "LandingPage"("workspaceId");
CREATE INDEX IF NOT EXISTS "LandingPage_userEmail_idx" ON "LandingPage"("userEmail");
CREATE INDEX IF NOT EXISTS "Domain_workspaceId_idx" ON "Domain"("workspaceId");

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_domainId_fkey"
  FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
