-- Add view_count column to events table
-- This column tracks how many times each event detail page has been viewed
-- Only visible to admins when view count mode is enabled

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_view_count ON events(view_count DESC);

-- Add comment for documentation
COMMENT ON COLUMN events.view_count IS 'Number of times the event detail page has been viewed (admin-only feature)';
