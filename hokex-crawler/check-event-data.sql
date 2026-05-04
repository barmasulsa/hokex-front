-- Check event data for 바이오코리아 2026
SELECT 
  title,
  description,
  admission_fee,
  exhibit_items,
  organizer,
  contact,
  operating_hours,
  venue_hall
FROM events
WHERE title LIKE '%바이오코리아%'
LIMIT 1;
