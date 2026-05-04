# Database Migrations

## How to Run Migrations

Since Supabase doesn't support direct SQL execution via the client library, you need to run migrations through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `add-poster-scraping-tables.sql`
4. Paste into the SQL Editor
5. Click **Run**

## Migration Files

- `add-poster-scraping-tables.sql` - Adds poster scraping improvement tables and columns

## What This Migration Does

1. Creates `scraping_failures` table for tracking failed scraping attempts
2. Creates `scraping_metrics` table for historical success rate tracking
3. Adds new columns to `events` table:
   - `last_scrape_attempt` - Timestamp of last scraping attempt
   - `last_scrape_success` - Timestamp of last successful scraping
   - `scrape_attempt_count` - Number of scraping attempts
   - `successful_scrape_strategy` - Which strategy succeeded (direct/schedule/search)
   - `venue_hall` - Hall information (Hall A, Hall B, etc.)
   - `exhibit_items` - Exhibition items/products
   - `exhibit_products` - Exhibition organizers/sponsors

## Verification

After running the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scraping_failures', 'scraping_metrics');
```

Check new columns in events table:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN (
  'last_scrape_attempt',
  'last_scrape_success',
  'scrape_attempt_count',
  'successful_scrape_strategy',
  'venue_hall',
  'exhibit_items',
  'exhibit_products'
);
```
