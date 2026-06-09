# Visitor Counter Setup Guide

## Current Status
✅ **Edge Function**: `track-visit` deployed to Supabase  
⏳ **Database Tables**: SQL file created but NOT YET EXECUTED

---

## Step 1: Execute SQL Migration (NOW)

### 1.1 Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2 Copy and Execute SQL
1. Open the file: `supabase-migrations/create-visitor-counter-tables.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** button

### 1.3 Verify Tables Created
Run this query to check:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('visitor_sites', 'visitor_logs', 'visitor_dedup');
```

You should see 3 tables:
- `visitor_sites`
- `visitor_logs`
- `visitor_dedup`

---

## Step 2: Test the Edge Function

### 2.1 Test with curl
```bash
curl -X POST https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/track-visit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "domain": "hokex.vercel.app",
    "timezone": "Asia/Seoul",
    "page_path": "/",
    "page_title": "Home"
  }'
```

Expected response:
```json
{
  "dashboardUrl": "https://your-domain.com/visitor-stats?domain=hokex.vercel.app",
  "totalCount": 1,
  "todayCount": 1,
  "counted": true
}
```

### 2.2 Test in Browser Console
```javascript
fetch('https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/track-visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    domain: 'hokex.vercel.app',
    timezone: 'Asia/Seoul',
    page_path: window.location.pathname,
    page_title: document.title
  })
})
.then(r => r.json())
.then(console.log)
```

---

## Step 3: Frontend Integration

### 3.1 Add to App.tsx (Global Tracking)
```typescript
// src/App.tsx
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

function App() {
  useEffect(() => {
    // Track page visit
    const trackVisit = async () => {
      try {
        const response = await fetch(
          `${supabase.supabaseUrl}/functions/v1/track-visit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabase.supabaseKey}`
            },
            body: JSON.stringify({
              domain: 'hokex.vercel.app',
              timezone: 'Asia/Seoul',
              page_path: window.location.pathname,
              page_title: document.title
            })
          }
        )
        
        const data = await response.json()
        console.log('Visit tracked:', data)
      } catch (error) {
        console.error('Failed to track visit:', error)
      }
    }
    
    trackVisit()
  }, [])

  return (
    // ... your app
  )
}
```

### 3.2 Create Visitor Stats Component
```typescript
// src/components/VisitorStats.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function VisitorStats() {
  const [stats, setStats] = useState({ total: 0, today: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('visitor_sites')
        .select('total_count, today_count')
        .eq('domain', 'hokex.vercel.app')
        .single()

      if (data) {
        setStats({
          total: data.total_count,
          today: data.today_count
        })
      }
    }

    fetchStats()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('visitor-stats')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'visitor_sites',
        filter: `domain=eq.hokex.vercel.app`
      }, (payload) => {
        setStats({
          total: payload.new.total_count,
          today: payload.new.today_count
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
      <div>Total Visits: {stats.total.toLocaleString()}</div>
      <div>Today: {stats.today.toLocaleString()}</div>
    </div>
  )
}
```

---

## Step 4: Create Dashboard Page (Optional)

### 4.1 Create Dashboard Route
```typescript
// src/pages/VisitorStatsPage.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function VisitorStatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      // Get site stats
      const { data: site } = await supabase
        .from('visitor_sites')
        .select('*')
        .eq('domain', 'hokex.vercel.app')
        .single()

      setStats(site)

      // Get recent logs
      const { data: recentLogs } = await supabase
        .from('visitor_logs')
        .select('*')
        .eq('site_id', site?.id)
        .order('timestamp', { ascending: false })
        .limit(50)

      setLogs(recentLogs || [])
    }

    fetchData()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Visitor Statistics</h1>
      
      {stats && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Overview</h2>
          <p>Domain: {stats.domain}</p>
          <p>Total Visits: {stats.total_count}</p>
          <p>Today: {stats.today_count}</p>
          <p>Last Visit: {stats.last_visit_date}</p>
        </div>
      )}

      <h2>Recent Visits</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Page</th>
            <th>Referrer</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.page_path}</td>
              <td>{log.referrer || '-'}</td>
              <td>{log.visitor_ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Features Implemented

### ✅ Deduplication
- 20-minute TTL prevents same visitor from being counted multiple times
- Based on IP + User Agent hash

### ✅ Timezone Support
- Accurate "today" count per timezone
- Default: UTC

### ✅ Detailed Logging
- Page path, title, referrer
- IP address, user agent
- Timestamp

### ✅ RLS Security
- Public: read visitor stats
- Service role: write operations
- Edge Function uses service role key

---

## Optional: Scheduled Cleanup

### Set up pg_cron for automatic cleanup

```sql
-- Clean expired dedup records every hour
SELECT cron.schedule(
  'clean-visitor-dedup',
  '0 * * * *',
  $$ SELECT clean_expired_dedup_records() $$
);

-- Reset daily counts at midnight KST (15:00 UTC)
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',
  $$ SELECT reset_daily_visitor_counts() $$
);
```

---

## Troubleshooting

### Issue: 401 Unauthorized
- Make sure you're using the correct `SUPABASE_ANON_KEY` in frontend
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` automatically

### Issue: Tables not found
- Run the SQL migration in Step 1
- Check table names are correct (lowercase)

### Issue: Duplicate visits counted
- Check deduplication logic in Edge Function
- Verify `visitor_dedup` table has records
- Check TTL is set correctly (20 minutes)

---

## Next Steps

After executing the SQL migration:
1. ✅ Test Edge Function with curl/browser
2. ✅ Add visitor tracking to frontend
3. ✅ Create visitor stats component
4. ✅ (Optional) Create dashboard page
5. ✅ (Optional) Set up scheduled cleanup jobs

---

## Reference
- Original project: https://github.com/rundevelrun/free-visit-counter-api-dashboard
- Edge Function URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/track-visit`
