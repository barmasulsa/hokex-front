-- Add venue_event_page_url column to events table
-- This stores the URL of the event page on the venue's website (e.g., COEX event page)

ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_event_page_url TEXT;

COMMENT ON COLUMN events.venue_event_page_url IS '전시장 행사 소개 페이지 URL (예: COEX 행사 페이지)';
