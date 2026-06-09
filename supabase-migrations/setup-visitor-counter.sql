-- ===================================================================
-- Visitor Counter System - Complete Setup
-- Run this in Supabase SQL Editor
-- ===================================================================

-- 1. visitor_sites: 사이트별 방문 통계
CREATE TABLE IF NOT EXISTS visitor_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  total_count INTEGER DEFAULT 0,
  today_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. visitor_logs: 개별 방문 로그
CREATE TABLE IF NOT EXISTS visitor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES visitor_sites(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'UTC',
  page_path TEXT,
  page_title TEXT,
  referrer TEXT,
  search_query TEXT,
  visitor_ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. visitor_dedup: 중복 방지 테이블 (20분 TTL)
CREATE TABLE IF NOT EXISTS visitor_dedup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES visitor_sites(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  ttl_expiry TIMESTAMPTZ NOT NULL,
  UNIQUE(site_id, visitor_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitor_sites_domain ON visitor_sites(domain);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_site_id ON visitor_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_timestamp ON visitor_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_visitor_dedup_site_hash ON visitor_dedup(site_id, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_visitor_dedup_ttl ON visitor_dedup(ttl_expiry);

-- RLS Policies
ALTER TABLE visitor_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_dedup ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read visitor stats" ON visitor_sites;
DROP POLICY IF EXISTS "Service role can manage sites" ON visitor_sites;
DROP POLICY IF EXISTS "Service role can manage logs" ON visitor_logs;
DROP POLICY IF EXISTS "Service role can manage dedup" ON visitor_dedup;

-- Create new policies
CREATE POLICY "Public can read visitor stats"
  ON visitor_sites FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage sites"
  ON visitor_sites FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage logs"
  ON visitor_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage dedup"
  ON visitor_dedup FOR ALL
  USING (auth.role() = 'service_role');

-- Function to clean expired dedup records
CREATE OR REPLACE FUNCTION clean_expired_dedup_records()
RETURNS void AS $$
BEGIN
  DELETE FROM visitor_dedup
  WHERE ttl_expiry < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily counts (run at midnight)
CREATE OR REPLACE FUNCTION reset_daily_visitor_counts()
RETURNS void AS $$
BEGIN
  UPDATE visitor_sites
  SET today_count = 0
  WHERE last_visit_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Visitor Counter tables created successfully!';
  RAISE NOTICE '📊 Tables: visitor_sites, visitor_logs, visitor_dedup';
  RAISE NOTICE '🔐 RLS policies configured';
  RAISE NOTICE '⚡ Functions: clean_expired_dedup_records, reset_daily_visitor_counts';
  RAISE NOTICE '🚀 Edge Function: /functions/v1/track-visit (already deployed)';
END $$;
