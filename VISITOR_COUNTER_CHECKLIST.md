# Visitor Counter Implementation Checklist

## Current Status
- ✅ Edge Function `track-visit` deployed
- ⏳ **NEXT**: Execute SQL migration to create database tables

---

## Quick Action Plan

### 🎯 Step 1: Execute SQL Migration (DO THIS NOW)
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy contents of `supabase-migrations/create-visitor-counter-tables.sql`
3. Paste and click **Run**
4. Verify with:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('visitor_sites', 'visitor_logs', 'visitor_dedup');
   ```

### ✅ Step 2: Test Edge Function
```bash
curl -X POST https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/track-visit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"domain":"hokex.vercel.app","timezone":"Asia/Seoul"}'
```

### ✅ Step 3: Frontend Integration
- Add tracking code to `App.tsx`
- Create `VisitorStats` component
- (Optional) Create dashboard page

---

## Files Created
1. ✅ `supabase/functions/track-visit/index.ts` - Edge Function (deployed)
2. ✅ `supabase-migrations/create-visitor-counter-tables.sql` - Database schema
3. ✅ `VISITOR_COUNTER_SETUP_GUIDE.md` - Detailed guide

---

## What You Get
- 🔢 Total visit counter
- 📊 Today's visit count
- 🕐 20-minute deduplication (prevents spam)
- 🌏 Timezone-aware counting
- 📝 Detailed visitor logs (IP, page, referrer)
- 🔒 Secure (RLS policies)

---

## Need Help?
See `VISITOR_COUNTER_SETUP_GUIDE.md` for:
- Detailed step-by-step instructions
- Code examples for frontend
- Dashboard implementation
- Troubleshooting tips
