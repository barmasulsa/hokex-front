-- Add venue_hall column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue_hall TEXT;

COMMENT ON COLUMN events.venue_hall IS '행사 장소 (홀 정보)';
