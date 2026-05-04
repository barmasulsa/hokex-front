# Database Migration Instructions

## Task 8: Database Operations with Transaction Support

This migration adds a PostgreSQL function for updating event scraping results with transaction support, and configures Row Level Security (RLS) policies for the scraping_failures table.

### Migration Files

1. `create-update-event-scraping-result-function.sql` - Transaction support function
2. `create-scraping-failures-rls-policies.sql` - RLS policies for failure logging

### Option 1: Apply via Supabase Dashboard (Recommended)

#### Step 1: Apply Transaction Function

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/create-update-event-scraping-result-function.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

#### Step 2: Apply RLS Policies

1. In the same SQL Editor
2. Copy the contents of `migrations/create-scraping-failures-rls-policies.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute

### Option 2: Apply via psql Command Line

```bash
# Apply transaction function
psql -h <your-supabase-host> -U postgres -d postgres -f migrations/create-update-event-scraping-result-function.sql

# Apply RLS policies
psql -h <your-supabase-host> -U postgres -d postgres -f migrations/create-scraping-failures-rls-policies.sql
```

### What These Migrations Do

#### Migration 1: Transaction Function

The `update_event_scraping_result` function:

1. **Updates event records** with scraping results (poster_url, description, admission_fee, etc.)
2. **Updates scraping metadata** (last_scrape_attempt, last_scrape_success, scrape_attempt_count, successful_scrape_strategy)
3. **Ensures atomicity** - either all updates succeed or all are rolled back
4. **Handles partial updates** - only updates fields that have new values using COALESCE

#### Migration 2: RLS Policies

The RLS policies:

1. **Enable RLS** on the scraping_failures table
2. **Allow service role to insert** failure log entries
3. **Allow service role to read** failure logs for monitoring
4. **Allow service role to update** failure logs (for marking as resolved)

### Requirements Satisfied

- **Requirement 3.4**: Update database with scraping results
- **Requirement 3.5**: Update additional fields (description, admission_fee)
- **Requirement 3.6**: Record scraping metadata
- **Requirement 4.5**: Log failures with detailed information
- **Requirement 6.1**: Create failure log entry

### Verification

#### Verify Transaction Function

After applying the migration, verify the function exists:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_event_scraping_result';
```

Expected output:
```
routine_name                    | routine_type
--------------------------------|-------------
update_event_scraping_result    | FUNCTION
```

#### Verify RLS Policies

Check that RLS policies are created:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'scraping_failures';
```

Expected output should show 3 policies:
- Allow service role to insert failures
- Allow service role to read failures
- Allow service role to update failures

### Testing

After applying both migrations, run the integration tests:

```bash
cd hokex-crawler
npm test -- batch-processor.database.test.ts
```

All tests should pass if migrations are applied correctly.

### Rollback (if needed)

#### Rollback Transaction Function

```sql
DROP FUNCTION IF EXISTS update_event_scraping_result;
```

#### Rollback RLS Policies

```sql
DROP POLICY IF EXISTS "Allow service role to insert failures" ON scraping_failures;
DROP POLICY IF EXISTS "Allow service role to read failures" ON scraping_failures;
DROP POLICY IF EXISTS "Allow service role to update failures" ON scraping_failures;

-- Optionally disable RLS
ALTER TABLE scraping_failures DISABLE ROW LEVEL SECURITY;
```

### Troubleshooting

#### Issue: "function update_event_scraping_result does not exist"

**Solution**: The system will automatically use the fallback method. This is expected if you haven't applied the migration yet. The fallback method works correctly but without transaction guarantees.

#### Issue: "new row violates row-level security policy"

**Solution**: Apply the RLS policies migration (`create-scraping-failures-rls-policies.sql`). This error occurs when trying to insert into scraping_failures without proper permissions.

#### Issue: Tests fail with permission errors

**Solution**: Ensure you're using the `SUPABASE_SERVICE_KEY` (not `SUPABASE_ANON_KEY`) in your `.env` file. The service key has elevated permissions needed for these operations.
