-- Add view_count column to banners table
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_banner_view_count(banner_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE banners
  SET view_count = view_count + 1
  WHERE id = banner_id;
END;
$$;

-- Grant execute permission to anon users (for public access)
GRANT EXECUTE ON FUNCTION increment_banner_view_count(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_banner_view_count(INTEGER) TO authenticated;
