# 방문자 통계 시스템 마이그레이션 가이드

## 📋 개요

기존 복잡한 visitor_stats 시스템을 단순한 visitor counter 시스템으로 완전 교체합니다.

---

## ⚠️ 주의사항

1. **기존 데이터 백업** 필수 (롤백용)
2. **Edge Function 재배포** 필요
3. **프론트엔드 코드 수정** 필요

---

## 🗂️ STEP 1: 기존 시스템 백업

```sql
-- 백업 테이블 생성
CREATE TABLE visitor_stats_backup AS SELECT * FROM visitor_stats;
CREATE TABLE visitor_stats_cache_backup AS SELECT * FROM visitor_stats_cache;

-- 백업 확인
SELECT COUNT(*) FROM visitor_stats_backup;
SELECT COUNT(*) FROM visitor_stats_cache_backup;
```

---

## 🗑️ STEP 2: 기존 시스템 완전 제거

```sql
-- 1. Cron Job 삭제
SELECT cron.unschedule('update-visitor-stats-cache');

-- 2. Trigger 삭제
DROP TRIGGER IF EXISTS auto_update_visitor_cache ON visitor_stats;

-- 3. Function 삭제
DROP FUNCTION IF EXISTS trigger_update_visitor_cache() CASCADE;
DROP FUNCTION IF EXISTS update_visitor_stats_cache() CASCADE;
DROP FUNCTION IF EXISTS get_business_date(TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS increment_visitor_stat(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_visitor_dedup() CASCADE;

-- 4. 테이블 삭제 (순서 중요 - 외래키 때문)
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS visitor_dedup CASCADE;
DROP TABLE IF EXISTS visitor_stats CASCADE;
DROP TABLE IF EXISTS visitor_stats_cache CASCADE;

-- 5. 기존 고급 통계 테이블도 삭제 (있다면)
DROP TABLE IF EXISTS visitor_sites CASCADE;
```

---

## ✅ STEP 3: 새 시스템 설치

Supabase SQL Editor에서 실행:

```bash
# 파일 내용 복사
hokex-front/supabase-migrations/setup-visitor-counter.sql
```

위 파일의 전체 내용을 SQL Editor에 붙여넣고 실행합니다.

---

## 🚀 STEP 4: Edge Function 생성/수정

### 4-1. track-visit Edge Function 생성

`supabase/functions/track-visit/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { domain } = await req.json()
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. visitor_sites에서 site_id 찾기 or 생성
    const { data: site, error: siteError } = await supabaseClient
      .from('visitor_sites')
      .select('id')
      .eq('domain', domain)
      .single()

    let siteId: string

    if (siteError && siteError.code === 'PGRST116') {
      // 사이트 없으면 생성
      const { data: newSite, error: createError } = await supabaseClient
        .from('visitor_sites')
        .insert({ domain, total_count: 0, today_count: 0 })
        .select('id')
        .single()

      if (createError) throw createError
      siteId = newSite.id
    } else if (siteError) {
      throw siteError
    } else {
      siteId = site.id
    }

    // 2. 방문자 해시 생성 (IP + User-Agent)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const visitorHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${ip}:${userAgent}`)
    ).then(buf => 
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    )

    // 3. 중복 체크 (20분 TTL)
    const { data: existing } = await supabaseClient
      .from('visitor_dedup')
      .select('id')
      .eq('site_id', siteId)
      .eq('visitor_hash', visitorHash)
      .gt('ttl_expiry', new Date().toISOString())
      .single()

    if (existing) {
      // 중복 방문 - 카운트하지 않음
      const { data: stats } = await supabaseClient
        .from('visitor_sites')
        .select('total_count, today_count')
        .eq('id', siteId)
        .single()

      return new Response(
        JSON.stringify({ 
          totalCount: stats?.total_count || 0, 
          todayCount: stats?.today_count || 0,
          duplicate: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 새 방문 기록
    const now = new Date()
    const ttlExpiry = new Date(now.getTime() + 20 * 60 * 1000) // 20분 후

    // Dedup 테이블에 추가
    await supabaseClient
      .from('visitor_dedup')
      .insert({
        site_id: siteId,
        visitor_hash: visitorHash,
        ttl_expiry: ttlExpiry.toISOString()
      })

    // Log 테이블에 추가
    await supabaseClient
      .from('visitor_logs')
      .insert({
        site_id: siteId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        visitor_ip: ip,
        user_agent: userAgent
      })

    // 5. 카운트 증가
    const today = new Date().toISOString().split('T')[0]
    
    const { data: updated, error: updateError } = await supabaseClient
      .from('visitor_sites')
      .update({
        total_count: supabaseClient.raw('total_count + 1'),
        today_count: supabaseClient.raw('CASE WHEN last_visit_date = ? THEN today_count + 1 ELSE 1 END', [today]),
        last_visit_date: today,
        updated_at: now.toISOString()
      })
      .eq('id', siteId)
      .select('total_count, today_count')
      .single()

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        totalCount: updated.total_count, 
        todayCount: updated.today_count,
        duplicate: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 4-2. Edge Function 배포

```bash
cd hokex-front
supabase functions deploy track-visit
```

---

## 🔧 STEP 5: 프론트엔드 코드 수정

### 5-1. 방문 추적 함수 수정

기존 `recordDetailedVisit()` 함수를 교체:

```typescript
// src/services/visitorService.ts
export const trackVisit = async (domain: string = 'hokex.xyz') => {
  try {
    const { data, error } = await supabase.functions.invoke('track-visit', {
      body: { domain }
    })

    if (error) throw error

    return {
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      isDuplicate: data.duplicate
    }
  } catch (error) {
    console.error('Failed to track visit:', error)
    return null
  }
}
```

### 5-2. 통계 조회 함수 수정

```typescript
// src/services/visitorService.ts
export const getVisitorStats = async (domain: string = 'hokex.xyz') => {
  try {
    const { data, error } = await supabase
      .from('visitor_sites')
      .select('total_count, today_count, last_visit_date')
      .eq('domain', domain)
      .single()

    if (error) throw error

    return {
      totalCount: data?.total_count || 0,
      todayCount: data?.today_count || 0,
      lastVisitDate: data?.last_visit_date
    }
  } catch (error) {
    console.error('Failed to get visitor stats:', error)
    return { totalCount: 0, todayCount: 0, lastVisitDate: null }
  }
}
```

### 5-3. 기존 함수 호출 부분 교체

```typescript
// Before (기존)
await recordDetailedVisit()
const stats = await getCachedVisitorStats()

// After (신규)
await trackVisit()
const stats = await getVisitorStats()
```

---

## 🧹 STEP 6: 정리 작업

### 6-1. 만료된 Dedup 레코드 정리 Cron 설정 (선택)

```sql
-- 1시간마다 만료된 레코드 삭제
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 * * * *',
  $$SELECT clean_expired_dedup_records();$$
);
```

### 6-2. 매일 자정 today_count 리셋 Cron 설정 (선택)

```sql
-- 매일 자정(KST) today_count 리셋
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',  -- UTC 15:00 = KST 00:00
  $$SELECT reset_daily_visitor_counts();$$
);
```

---

## ✅ STEP 7: 검증

```sql
-- 1. 테이블 확인
SELECT * FROM visitor_sites;
SELECT * FROM visitor_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM visitor_dedup ORDER BY last_visit DESC LIMIT 10;

-- 2. 통계 확인
SELECT 
  domain,
  total_count,
  today_count,
  last_visit_date,
  updated_at
FROM visitor_sites
WHERE domain = 'hokex.xyz';
```

---

## 🔄 롤백 방법 (문제 발생 시)

```sql
-- 1. 새 시스템 삭제
DROP TABLE IF EXISTS visitor_sites CASCADE;
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS visitor_dedup CASCADE;
DROP FUNCTION IF EXISTS clean_expired_dedup_records() CASCADE;
DROP FUNCTION IF EXISTS reset_daily_visitor_counts() CASCADE;

-- 2. 백업 복원
ALTER TABLE visitor_stats_backup RENAME TO visitor_stats;
ALTER TABLE visitor_stats_cache_backup RENAME TO visitor_stats_cache;

-- 3. 기존 함수/트리거 재생성 (VISITOR_STATS_COMPLETE_SETUP.sql 재실행)
```

---

## 📊 시스템 비교

| 항목 | 기존 시스템 | 신규 시스템 |
|------|------------|------------|
| 테이블 수 | 2개 (stats, cache) | 3개 (sites, logs, dedup) |
| 복잡도 | 높음 (비즈니스 날짜, 트리거, cron) | 낮음 (단순 카운터) |
| 실시간성 | 1분 지연 (cron) | 즉시 반영 |
| 중복 방지 | 없음 | 20분 TTL |
| 상세 로그 | 시간대별 | 개별 방문별 |
| 다중 도메인 | 불가 | 가능 |

---

## 🎯 마이그레이션 완료 체크리스트

- [ ] 기존 데이터 백업 완료
- [ ] 기존 시스템 제거 완료
- [ ] 새 시스템 설치 완료
- [ ] Edge Function 배포 완료
- [ ] 프론트엔드 코드 수정 완료
- [ ] 테스트 완료 (실제 방문 카운팅 확인)
- [ ] Cron 작업 설정 완료 (선택)
- [ ] 백업 파일 보관 완료

---

## 💡 Tips

1. **점진적 마이그레이션**: 먼저 개발 환경에서 테스트 후 프로덕션 적용
2. **데이터 보존**: 백업 테이블은 최소 1주일 보관
3. **모니터링**: 처음 24시간은 통계 정확성 모니터링 필수
