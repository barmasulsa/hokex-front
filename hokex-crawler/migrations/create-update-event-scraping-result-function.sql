-- Create function for updating event scraping results with transaction support
-- This ensures atomicity - either all updates succeed or all are rolled back
-- Requirements: 3.4, 3.5, 3.6

CREATE OR REPLACE FUNCTION update_event_scraping_result(
  p_event_id UUID,
  p_poster_url TEXT,
  p_description TEXT,
  p_admission_fee TEXT,
  p_organizer TEXT,
  p_contact TEXT,
  p_operating_hours TEXT,
  p_venue_hall TEXT,
  p_exhibit_items TEXT,
  p_exhibit_products TEXT,
  p_successful_strategy TEXT,
  p_scrape_success BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update event record with scraping results
  -- Uses COALESCE to only update fields that have new values
  UPDATE events
  SET
    poster_url = COALESCE(p_poster_url, poster_url),
    description = COALESCE(p_description, description),
    admission_fee = COALESCE(p_admission_fee, admission_fee),
    organizer = COALESCE(p_organizer, organizer),
    contact = COALESCE(p_contact, contact),
    operating_hours = COALESCE(p_operating_hours, operating_hours),
    venue_hall = COALESCE(p_venue_hall, venue_hall),
    exhibit_items = COALESCE(p_exhibit_items, exhibit_items),
    exhibit_products = COALESCE(p_exhibit_products, exhibit_products),
    last_scrape_attempt = NOW(),
    last_scrape_success = CASE WHEN p_scrape_success THEN NOW() ELSE last_scrape_success END,
    scrape_attempt_count = COALESCE(scrape_attempt_count, 0) + 1,
    successful_scrape_strategy = CASE WHEN p_scrape_success THEN p_successful_strategy ELSE successful_scrape_strategy END,
    updated_at = NOW()
  WHERE id = p_event_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with id % not found', p_event_id;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically on exception
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_event_scraping_result TO authenticated;
GRANT EXECUTE ON FUNCTION update_event_scraping_result TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION update_event_scraping_result IS 
  'Updates event record with scraping results using transaction support. ' ||
  'Ensures atomicity - either all updates succeed or all are rolled back. ' ||
  'Requirements: 3.4, 3.5, 3.6';
