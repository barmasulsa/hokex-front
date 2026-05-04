-- Add supervisor column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS supervisor TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN events.supervisor IS '주관 (행사를 주관하는 기관/단체)';
