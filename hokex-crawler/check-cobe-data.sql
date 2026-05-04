-- Check 코베 베이비페어 data
SELECT 
  title,
  exhibit_items,
  exhibit_products
FROM events
WHERE title LIKE '%코베%베이비%'
LIMIT 1;
