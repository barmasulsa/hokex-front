-- HOKEX Crawler Database Schema Extensions
-- Run this in Supabase SQL Editor after the main schema

-- ============================================
-- Task 2.1: Add status columns to events table
-- ============================================

-- Add new columns to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS crawl_source TEXT,
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_crawl_source ON events(crawl_source);

-- ============================================
-- Task 2.2: Create crawl_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT NOT NULL,
  venue_code TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failure', 'timeout')),
  events_collected INTEGER DEFAULT 0,
  events_new INTEGER DEFAULT 0,
  events_duplicate INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_invalid INTEGER DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for crawl_logs
CREATE INDEX IF NOT EXISTS idx_crawl_logs_venue_code ON crawl_logs(venue_code);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_job_id ON crawl_logs(job_id);

-- ============================================
-- Task 2.3: Create venue_configs table
-- ============================================

CREATE TABLE IF NOT EXISTS venue_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_code TEXT UNIQUE NOT NULL,
  venue_name TEXT NOT NULL,
  region TEXT NOT NULL,
  base_url TEXT NOT NULL,
  excel_file_url TEXT,
  file_format TEXT CHECK (file_format IN ('xlsx', 'xls', 'csv')),
  is_active BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT false,
  crawl_interval_hours INTEGER DEFAULT 720, -- 30 days default
  last_successful_crawl TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  adapter_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for venue_configs
CREATE INDEX IF NOT EXISTS idx_venue_configs_is_active ON venue_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_venue_configs_venue_code ON venue_configs(venue_code);

-- ============================================
-- Task 2.4: Create crawl_event_details table
-- ============================================

CREATE TABLE IF NOT EXISTS crawl_event_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crawl_log_id UUID REFERENCES crawl_logs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,
  processing_result TEXT NOT NULL CHECK (processing_result IN ('new', 'duplicate', 'updated', 'invalid', 'error')),
  validation_errors JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for crawl_event_details
CREATE INDEX IF NOT EXISTS idx_crawl_event_details_crawl_log_id ON crawl_event_details(crawl_log_id);
CREATE INDEX IF NOT EXISTS idx_crawl_event_details_processing_result ON crawl_event_details(processing_result);
CREATE INDEX IF NOT EXISTS idx_crawl_event_details_event_id ON crawl_event_details(event_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

-- Trigger for venue_configs updated_at
CREATE OR REPLACE FUNCTION update_venue_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venue_configs_updated_at
  BEFORE UPDATE ON venue_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_configs_updated_at();

-- ============================================
-- Insert initial venue configurations
-- ============================================

INSERT INTO venue_configs (venue_code, venue_name, region, base_url, is_active, auto_approve, adapter_config) VALUES
-- Seoul venues
('COEX', '코엑스', '서울', 'https://www.coex.co.kr', true, false, '{"columnMappings": {}}'),
('COEX_MAGOK', '코엑스 마곡', '서울', 'https://www.coexmagok.co.kr', true, false, '{"columnMappings": {}}'),
('AT_CENTER', 'aT센터', '서울', 'https://www.atcenter.or.kr', true, false, '{"columnMappings": {}}'),
('SETEC', '세텍', '서울', 'https://www.setec.or.kr', true, false, '{"columnMappings": {}}'),

-- Gyeonggi venues
('KINTEX', '킨텍스', '수도권', 'https://www.kintex.com', true, false, '{"columnMappings": {}}'),
('SUWON_CONV', '수원컨벤션센터', '수도권', 'https://www.suwonconv.or.kr', true, false, '{"columnMappings": {}}'),
('SONGDO', '송도컨벤시아', '수도권', 'https://www.songdoconvensia.com', true, false, '{"columnMappings": {}}'),
('SUWON_MESSE', '수원메쎄', '수도권', 'https://www.suwonmesse.com', true, false, '{"columnMappings": {}}'),

-- Chungcheong venues
('DAEJEON_CONV', '대전컨벤션센터', '충청도', 'https://www.dcckorea.or.kr', true, false, '{"columnMappings": {}}'),
('SEJONG_CONV', '세종컨벤션센터', '충청도', 'https://www.sejongconv.or.kr', true, false, '{"columnMappings": {}}'),
('CHEONGJU_OSCO', '청주오스코', '충청도', 'https://www.osco.or.kr', true, false, '{"columnMappings": {}}'),

-- Jeolla venues
('KIMDAEJUNG_CONV', '김대중컨벤션센터', '전라도', 'https://www.kdj.or.kr', true, false, '{"columnMappings": {}}'),
('GUNSAN_CONV', '군산새만금컨벤션센터', '전라도', 'https://www.gsconv.or.kr', true, false, '{"columnMappings": {}}'),

-- Gangwon venues
('GANGNEUNG_ARENA', '강릉아레나', '강원도', 'https://www.gangnungarena.co.kr', true, false, '{"columnMappings": {}}'),
('WONJU_CONV', '원주컨벤션센터', '강원도', 'https://www.wjconvention.com', true, false, '{"columnMappings": {}}'),

-- Gyeongsang venues
('BEXCO', '벡스코', '경상도', 'https://www.bexco.co.kr', true, false, '{"columnMappings": {}}'),
('EXCO', '엑스코', '경상도', 'https://www.exco.co.kr', true, false, '{"columnMappings": {}}'),
('CHANGWON_CONV', '창원컨벤션센터', '경상도', 'https://www.ceco.co.kr', true, false, '{"columnMappings": {}}'),
('UECO', '유에코', '경상도', 'https://www.ueco.or.kr', true, false, '{"columnMappings": {}}'),
('GYEONGJU_CONV', '경주화백컨벤션센터', '경상도', 'https://www.hwabaek.co.kr', true, false, '{"columnMappings": {}}'),
('GUMICO', '구미코', '경상도', 'https://www.gumico.or.kr', true, false, '{"columnMappings": {}}'),

-- Jeju venue
('ICC_JEJU', '제주국제컨벤션센터', '제주도', 'https://www.iccjeju.co.kr', true, false, '{"columnMappings": {}}')

ON CONFLICT (venue_code) DO NOTHING;

-- ============================================
-- Verification queries
-- ============================================

-- Check if all tables were created
SELECT 
  'events' as table_name, 
  COUNT(*) FILTER (WHERE column_name = 'status') as has_status_column,
  COUNT(*) FILTER (WHERE column_name = 'crawl_source') as has_crawl_source_column
FROM information_schema.columns 
WHERE table_name = 'events'
UNION ALL
SELECT 'crawl_logs', COUNT(*), 0 FROM crawl_logs WHERE false
UNION ALL
SELECT 'venue_configs', COUNT(*), 0 FROM venue_configs
UNION ALL
SELECT 'crawl_event_details', COUNT(*), 0 FROM crawl_event_details WHERE false;

-- List all venue configurations
SELECT venue_code, venue_name, region, is_active 
FROM venue_configs 
ORDER BY region, venue_name;
