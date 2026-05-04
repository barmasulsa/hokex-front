-- Add exhibit_products column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS exhibit_products TEXT;

-- Add comment
COMMENT ON COLUMN events.exhibit_products IS '전시품목 (전시되는 품목/내용)';
