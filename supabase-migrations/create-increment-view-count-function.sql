-- Create a function to increment view count atomically
-- This function is called by the batch update process

CREATE OR REPLACE FUNCTION increment_view_count(
  event_id UUID,
  increment_by INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET view_count = view_count + increment_by
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_view_count(UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_view_count IS 'Atomically increments the view count for an event by the specified amount';
