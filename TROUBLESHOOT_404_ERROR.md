# 🔍 404 에러 해결 가이드

## ❌ 현재 상황
- `sync-stibee-subscribers` 함수 호출 시 404 에러 발생
- 함수가 Supabase에 제대로 배포되지 않았을 가능성

## ✅ 확인 사항

### 1. Supabase Dashboard에서 함수 존재 확인
1. https://supabase.com/dashboard 접속
2. 프로젝트 `qmhxnxnaawtjelqlgyig` 선택
3. 왼쪽 메뉴 **Edge Functions** 클릭
4. 함수 목록에서 다음 3개 함수가 있는지 확인:
   - ✅ `check-stibee-subscriber` (이미 존재)
   - ❓ `sync-stibee-subscribers` (확인 필요)
   - ❓ `stibee-webhook` (확인 필요)

### 2. 함수가 없는 경우 → 새로 생성

#### sync-stibee-subscribers 함수 생성:
1. **Create a new function** 버튼 클릭
2. Function name: `sync-stibee-subscribers` (정확히 입력)
3. 아래 코드 전체 복사 → 붙여넣기
4. **Deploy** 버튼 클릭

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

### 3. 함수가 있는 경우 → 환경 변수 확인
1. 함수 클릭 → **Settings** 탭
2. **Secrets** 섹션에서 다음 2개 확인:
   - `STIBEE_API_KEY` = `api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921`
   - `STIBEE_LIST_ID` = `289942`

### 4. 배포 상태 확인
1. 함수 페이지에서 **Deployments** 탭 확인
2. 최근 배포가 **Active** 상태인지 확인
3. 배포 실패 시 에러 로그 확인

### 5. 함수 이름 정확히 확인
- ❌ 잘못된 이름: `sync-stibee-subscriber` (끝에 s 없음)
- ✅ 올바른 이름: `sync-stibee-subscribers` (끝에 s 있음)

---

## 🔄 다음 단계

함수 생성/배포 완료 후:

### 1. 초기 동기화 실행
```powershell
Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

### 2. 결과 확인
Supabase SQL Editor에서:
```sql
SELECT COUNT(*) as total FROM stibee_subscribers;
SELECT email, last_synced_at FROM stibee_subscribers ORDER BY last_synced_at DESC LIMIT 10;
```

---

## 💡 참고

- Edge Functions는 배포 후 즉시 사용 가능
- 함수 이름은 대소문자 구분
- 환경 변수는 배포 후 자동으로 적용됨
