-- Create Row Level Security (RLS) policies for scraping_failures table
-- This allows the service role to insert and read failure logs
-- Requirements: 4.5, 6.1

-- Enable RLS on scraping_failures table (if not already enabled)
ALTER TABLE scraping_failures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow service role to insert failures" ON scraping_failures;
DROP POLICY IF EXISTS "Allow service role to read failures" ON scraping_failures;
DROP POLICY IF EXISTS "Allow service role to update failures" ON scraping_failures;

-- Allow service role to insert failure logs
CREATE POLICY "Allow service role to insert failures"
ON scraping_failures
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to read failure logs
CREATE POLICY "Allow service role to read failures"
ON scraping_failures
FOR SELECT
TO service_role
USING (true);

-- Allow service role to update failure logs (for marking as resolved)
CREATE POLICY "Allow service role to update failures"
ON scraping_failures
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Allow authenticated users to read their own failures
-- Uncomment if you want users to see failure logs in the UI
-- CREATE POLICY "Allow authenticated users to read failures"
-- ON scraping_failures
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- Add comment for documentation
COMMENT ON POLICY "Allow service role to insert failures" ON scraping_failures IS 
  'Allows the service role to insert failure log entries when scraping fails';

COMMENT ON POLICY "Allow service role to read failures" ON scraping_failures IS 
  'Allows the service role to query failure logs for monitoring and reporting';

COMMENT ON POLICY "Allow service role to update failures" ON scraping_failures IS 
  'Allows the service role to mark failures as resolved after manual intervention';
