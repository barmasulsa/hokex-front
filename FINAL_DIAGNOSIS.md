# 🔍 최종 진단: 함수가 실제로 배포되지 않음

## ❌ 현재 상황
- Logs 탭에 "No results found" → 함수가 한 번도 실행되지 않음
- 404 에러 발생 → 함수가 존재하지 않음
- 배포 버튼은 눌렀지만 실제로 배포되지 않았을 가능성

## ✅ 해결 방법

### 1. Deployments 탭 확인
1. `sync-stibee-subscribers` 함수 페이지에서
2. **Deployments** 탭 클릭
3. 배포 기록이 있는지 확인

**예상 결과:**
- ✅ 배포 기록이 있고 "Active" 상태 → 다른 문제
- ❌ 배포 기록이 없음 → 함수가 실제로 배포되지 않음

### 2. 함수 목록에서 확인
1. Edge Functions 메인 페이지로 이동
2. 함수 목록 확인:
   - `check-stibee-subscriber` ✅ (이미 존재)
   - `sync-stibee-subscribers` ❓ (확인 필요)
   - `stibee-webhook` ❓ (확인 필요)

### 3. 함수가 없다면 → 새로 생성 필요

Supabase Dashboard에서:
1. **Edge Functions** 페이지
2. **Create a new function** 버튼 클릭
3. Function name: `sync-stibee-subscribers`
4. 아래 코드 전체 복사 붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('❌ Stibee API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Starting Stibee subscriber sync...`)

    let allSubscribers: any[] = []
    let offset = 0
    let hasMore = true
    const limit = 1000
    const MAX_ITERATIONS = 20
    let iteration = 0

    while (hasMore && iteration < MAX_ITERATIONS) {
      const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers?offset=${offset}&limit=${limit}`
      console.log(`📡 Fetching offset ${offset} (iteration ${iteration + 1})...`)

      const stibeeResponse = await fetch(stibeeUrl, {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!stibeeResponse.ok) {
        console.error(`❌ Stibee API error: ${stibeeResponse.status}`)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscribers from Stibee' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const stibeeData = await stibeeResponse.json()
      
      let pageSubscribers: any[] = []
      if (Array.isArray(stibeeData)) {
        pageSubscribers = stibeeData
      } else if (stibeeData.Value && Array.isArray(stibeeData.Value)) {
        pageSubscribers = stibeeData.Value
      } else if (stibeeData.value && Array.isArray(stibeeData.value)) {
        pageSubscribers = stibeeData.value
      } else if (stibeeData.data && Array.isArray(stibeeData.data)) {
        pageSubscribers = stibeeData.data
      } else if (stibeeData.subscribers && Array.isArray(stibeeData.subscribers)) {
        pageSubscribers = stibeeData.subscribers
      }

      console.log(`📊 Offset ${offset}: ${pageSubscribers.length} subscribers`)

      if (!pageSubscribers || pageSubscribers.length === 0) {
        console.log(`⚠️ Offset ${offset} returned no subscribers, stopping...`)
        hasMore = false
      } else {
        allSubscribers = allSubscribers.concat(pageSubscribers)
        
        if (pageSubscribers.length < limit) {
          console.log(`✅ Offset ${offset} returned ${pageSubscribers.length} subscribers (less than limit), this is the last batch`)
          hasMore = false
        } else {
          offset += limit
          iteration++
        }
      }
    }

    console.log(`📊 Total subscribers fetched: ${allSubscribers.length}`)

    const subscribersToInsert = allSubscribers.map(sub => ({
      email: sub.email?.toLowerCase().trim(),
      subscribed_at: sub.subscribedAt || sub.created_at || new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })).filter(sub => sub.email)

    console.log(`💾 Upserting ${subscribersToInsert.length} subscribers to DB...`)

    const BATCH_SIZE = 500
    let insertedCount = 0
    let errorCount = 0

    for (let i = 0; i < subscribersToInsert.length; i += BATCH_SIZE) {
      const batch = subscribersToInsert.slice(i, i + BATCH_SIZE)
      
      const { error } = await supabase
        .from('stibee_subscribers')
        .upsert(batch, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error)
        errorCount += batch.length
      } else {
        insertedCount += batch.length
        console.log(`✅ Batch ${i / BATCH_SIZE + 1} inserted: ${batch.length} records`)
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { error: deleteError } = await supabase
      .from('stibee_subscribers')
      .delete()
      .lt('last_synced_at', oneHourAgo)

    if (deleteError) {
      console.error('❌ Error deleting old subscribers:', deleteError)
    }

    console.log(`✅ Sync completed: ${insertedCount} inserted, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true,
        totalFetched: allSubscribers.length,
        inserted: insertedCount,
        errors: errorCount,
        syncedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

5. **Deploy** 버튼 클릭
6. 배포 완료 대기 (1-2분)

### 4. 환경 변수 추가
배포 후:
1. Settings 탭 → Secrets
2. 다음 2개 추가:
   - `STIBEE_API_KEY` = `api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921`
   - `STIBEE_LIST_ID` = `289942`

### 5. 다시 테스트
PowerShell에서:
```powershell
Invoke-RestMethod -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

---

## 💡 핵심 포인트

**"No results found"의 의미:**
- 함수가 실행되지 않음 = 로그가 없음
- 404 에러 = 함수가 존재하지 않음
- **결론: 함수가 실제로 배포되지 않았음**

**다음 단계:**
1. Deployments 탭 스크린샷 보내주세요
2. 또는 Edge Functions 목록 스크린샷 보내주세요
3. 함수가 없으면 위 방법대로 새로 생성하세요
