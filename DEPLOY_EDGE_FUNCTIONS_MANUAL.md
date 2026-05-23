# 🚀 Edge Functions 수동 배포 가이드

## ❌ 문제 상황
- `sync-stibee-subscribers` 함수 호출 시 404 에러 발생
- 함수 코드는 작성되었지만 Supabase에 배포되지 않음

## ✅ 해결 방법: Supabase Dashboard에서 수동 배포

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 `qmhxnxnaawtjelqlgyig` 선택
3. 왼쪽 메뉴에서 **Edge Functions** 클릭 (번개 모양 아이콘)

### 2단계: sync-stibee-subscribers 함수 생성/배포

#### 방법 A: 함수가 이미 존재하는 경우
1. 함수 목록에서 `sync-stibee-subscribers` 찾기
2. 함수 클릭 → **Code** 탭
3. 아래 코드 전체 복사해서 붙여넣기
4. **Deploy** 버튼 클릭

#### 방법 B: 함수가 없는 경우
1. **Create a new function** 버튼 클릭
2. Function name: `sync-stibee-subscribers`
3. 아래 코드 전체 복사해서 붙여넣기
4. **Deploy** 버튼 클릭

### 함수 코드:

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
    // Supabase 클라이언트 생성 (Service Role 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Stibee API 설정
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

    // Stibee API로 전체 구독자 목록 조회 (offset 방식 페이지네이션)
    let allSubscribers: any[] = []
    let offset = 0
    let hasMore = true
    const limit = 1000
    const MAX_ITERATIONS = 20  // 최대 20회 (20,000명)
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
      
      // 응답 구조 파악
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
          offset += limit  // 다음 offset으로 이동
          iteration++
        }
      }
    }

    console.log(`📊 Total subscribers fetched: ${allSubscribers.length}`)

    // DB에 저장 (upsert)
    const subscribersToInsert = allSubscribers.map(sub => ({
      email: sub.email?.toLowerCase().trim(),
      subscribed_at: sub.subscribedAt || sub.created_at || new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })).filter(sub => sub.email) // 이메일이 있는 것만

    console.log(`💾 Upserting ${subscribersToInsert.length} subscribers to DB...`)

    // 배치로 나눠서 저장 (한 번에 너무 많으면 타임아웃)
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

    // 동기화되지 않은 오래된 구독자 삭제 (선택사항)
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

### 3단계: 환경 변수 설정 (이미 했다면 스킵)
1. 함수 페이지에서 **Settings** 탭 클릭
2. **Secrets** 섹션에서 다음 2개 확인:
   - `STIBEE_API_KEY`
   - `STIBEE_LIST_ID`
3. 없으면 추가

### 4단계: 배포 확인
배포 완료 후 PowerShell에서 테스트:

```powershell
Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

---

## 📝 다음 단계

배포 완료 후:
1. 위 PowerShell 명령어로 초기 동기화 실행
2. 스티비 웹훅 설정
3. DB에서 구독자 확인

---

## 💡 참고

- Edge Functions는 Supabase CLI 또는 Dashboard에서 배포 가능
- 현재 시스템에 Supabase CLI가 설치되어 있지 않아 Dashboard 사용 권장
- 함수 배포 후 즉시 사용 가능 (재시작 불필요)
