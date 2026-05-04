-- Create event-posters bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-posters');

-- Allow service role to upload
CREATE POLICY IF NOT EXISTS "Service role upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-posters');

-- Allow service role to update
CREATE POLICY IF NOT EXISTS "Service role update access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-posters');

-- Allow service role to delete
CREATE POLICY IF NOT EXISTS "Service role delete access"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-posters');
