-- ============================================================
-- ColdCRM Upgrade v2 Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to leads_cache
ALTER TABLE leads_cache
  ADD COLUMN IF NOT EXISTS country                TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS "websiteQuality"       TEXT,
  ADD COLUMN IF NOT EXISTS "websiteQualityLabel"  TEXT,
  ADD COLUMN IF NOT EXISTS "websiteQualityDetails" TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "salesAngle"           TEXT;

-- 2. Drop old index, add new one with country
DROP INDEX IF EXISTS leads_cache_city_state_industry_idx;
CREATE INDEX IF NOT EXISTS leads_cache_location_idx
  ON leads_cache (city, state, country, industry);

-- 3. Performance index for call queue
CREATE INDEX IF NOT EXISTS leads_cache_score_idx
  ON leads_cache (score DESC);

CREATE INDEX IF NOT EXISTS leads_cache_phone_idx
  ON leads_cache (phone)
  WHERE phone IS NOT NULL;

-- 4. Index for expiry cleanup
CREATE INDEX IF NOT EXISTS leads_cache_expiry_idx
  ON leads_cache ("expiresAt");

-- Done! Run: npx prisma generate
