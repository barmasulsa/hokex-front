-- Add exhibit_items column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS exhibit_items TEXT;

-- Add comment
COMMENT ON COLUMN events.exhibit_items IS '전시품목';
