-- =====================================================
-- DIAGNOSE: Why login fails with SUBSCRIBER_ONLY error
-- Even though email is in Stibee subscriber list
-- =====================================================

-- STEP 1: Check if email exists in stibee_subscribers table
SELECT 
  email,
  last_synced_at,
  created_at
FROM stibee_subscribers
WHERE email = 'sadpandadayo@gmail.com';

-- Expected: Should return 1 row if synced
-- If 0 rows: Email not synced to DB yet

-- STEP 2: Check if user account exists in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'sadpandadayo@gmail.com';

-- Expected: Should return 1 row
-- If 0 rows: Account doesn't exist yet

-- STEP 3: Check if user profile exists
SELECT 
  id,
  email,
  is_admin,
  nickname,
  created_at
FROM user_profiles
WHERE email = 'sadpandadayo@gmail.com';

-- Expected: Should return 1 row
-- If 0 rows: Profile not created yet

-- STEP 4: Check all emails in stibee_subscribers (to verify table is populated)
SELECT 
  COUNT(*) as total_subscribers,
  MIN(last_synced_at) as oldest_sync,
  MAX(last_synced_at) as newest_sync
FROM stibee_subscribers;

-- Expected: Should show total count and sync times
-- If 0: Table is empty, sync failed

-- STEP 5: Check recent sync activity
SELECT 
  email,
  last_synced_at
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;

-- Shows most recently synced subscribers

-- =====================================================
-- DIAGNOSIS RESULTS INTERPRETATION:
-- =====================================================
-- 
-- CASE A: Email NOT in stibee_subscribers table
--   → Edge Function will check Stibee API (slower)
--   → If API check also fails: login blocked
--   → SOLUTION: Run sync OR add email manually
--
-- CASE B: Email IS in stibee_subscribers table
--   → Edge Function should return isSubscriber: true
--   → If still fails: Check Edge Function logs
--   → SOLUTION: Check Supabase Edge Function logs
--
-- CASE C: Table is empty (0 subscribers)
--   → Sync never ran or failed
--   → SOLUTION: Run manual sync or check sync function
--
-- =====================================================
-- QUICK FIX: Add email manually to stibee_subscribers
-- =====================================================

-- Run this ONLY if email is confirmed to be in Stibee but missing from DB:
/*
INSERT INTO stibee_subscribers (email, last_synced_at)
VALUES ('sadpandadayo@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();
*/

-- After adding, test login again

-- =====================================================
-- CHECK EDGE FUNCTION ENVIRONMENT VARIABLES
-- =====================================================
-- Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
-- Verify these are set:
-- 1. STIBEE_API_KEY (should be your API key)
-- 2. STIBEE_LIST_ID (should be your list ID)
--
-- If missing: Add them in dashboard
-- =====================================================
