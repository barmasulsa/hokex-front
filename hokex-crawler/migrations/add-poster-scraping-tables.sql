-- Migration: Add poster scraping improvement tables and columns
-- Date: 2026-05-02
-- Description: Adds scraping_failures, scraping_metrics tables and updates events table

-- Create scraping_failures table
CREATE TABLE IF NOT EXISTS scraping_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  attempted_strategies TEXT[] NOT NULL,
  errors JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  
  CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scraping_failures_event_id ON scraping_failures(event_id);
CREATE INDEX IF NOT EXISTS idx_scraping_failures_resolved ON scraping_failures(resolved);
CREATE INDEX IF NOT EXISTS idx_scraping_failures_timestamp ON scraping_failures(timestamp);

-- Create scraping_metrics table
CREATE TABLE IF NOT EXISTS scraping_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_attempts INTEGER NOT NULL,
  successful_attempts INTEGER NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,
  strategy_breakdown JSONB NOT NULL,
  failure_reasons JSONB NOT NULL,
  
  CHECK (success_rate >= 0 AND success_rate <= 100)
);

CREATE INDEX IF NOT EXISTS idx_scraping_metrics_timestamp ON scraping_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_scraping_metrics_success_rate ON scraping_metrics(success_rate);

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS last_scrape_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_scrape_success TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scrape_attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_scrape_strategy TEXT,
ADD COLUMN IF NOT EXISTS venue_hall TEXT,
ADD COLUMN IF NOT EXISTS exhibit_items TEXT,
ADD COLUMN IF NOT EXISTS exhibit_products TEXT;

CREATE INDEX IF NOT EXISTS idx_events_last_scrape_attempt ON events(last_scrape_attempt);
CREATE INDEX IF NOT EXISTS idx_events_poster_url_null ON events(poster_url) WHERE poster_url IS NULL;

-- Add comment for documentation
COMMENT ON TABLE scraping_failures IS 'Tracks failed poster scraping attempts for manual review';
COMMENT ON TABLE scraping_metrics IS 'Stores historical success rate metrics for poster scraping';
COMMENT ON COLUMN events.last_scrape_attempt IS 'Timestamp of last poster scraping attempt';
COMMENT ON COLUMN events.last_scrape_success IS 'Timestamp of last successful poster scraping';
COMMENT ON COLUMN events.scrape_attempt_count IS 'Number of times poster scraping was attempted';
COMMENT ON COLUMN events.successful_scrape_strategy IS 'Strategy that successfully scraped the poster (direct, schedule, search)';
