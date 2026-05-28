# 오늘 방문자 수 집계 문제 해결 가이드

## 🔍 문제 증상

- 방문자 통계에서 "오늘 방문자 수"가 0으로 표시되거나 실제보다 적게 표시됨
- 다른 기간(어제, 최근 7일 등)은 정상적으로 표시됨

## 🐛 원인 분석

### 1. Edge Function 버그
**위치**: `supabase/functions/update-visitor-stats-cache/index.ts`

**문제**: `type: 'full'` 업데이트 시 `visit_hour` 컬럼을 SELECT하지 않아서 시간대별 데이터 합산이 제대로 되지 않음

**Before (버그)**:
```typescript
const { data: records, error } = await supabase
  .from('visitor_stats')
  .select('visit_date, visit_count')  // ❌ visit_hour 누락
  .gte('visit_date', oneYearAgoStr)
```

**After (수정)**:
```typescript
const { data: records, error } = await supabase
  .from('visitor_stats')
  .select('visit_date, visit_hour, visit_count')  // ✅ visit_hour 포함
  .gte('visit_date', oneYearAgoStr)
```

### 2. 캐시 업데이트 주기 문제
- **30분마다**: 오늘 방문자 수만 업데이트 (`type: 'today'`)
- **새벽 4시**: 전체 통계 업데이트 (`type: 'full'`)

→ 새벽 4시 전체 업데이트에서 버그가 있어서 오늘 방문자 수가 잘못 계산됨

## ✅ 해결 방법

### 방법 1: Edge Function 재배포 (권장)

1. **수정된 Edge Function 배포**:
```bash
cd hokex-front
supabase functions deploy update-visitor-stats-cache
```

2. **수동으로 캐시 업데이트 트리거**:
```bash
# 오늘 방문자 수만 업데이트
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"today"}'

# 전체 통계 업데이트
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}'
```

### 방법 2: SQL로 직접 캐시 업데이트 (즉시 해결)

**Supabase Dashboard → SQL Editor**에서 실행:

```sql
-- 캐시 강제 업데이트 (전체 재계산)
WITH stats AS (
  SELECT 
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count ELSE 0 END), 0) as last_30_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN visit_count ELSE 0 END), 0) as last_365_days_count,
    COALESCE(SUM(visit_count), 0) as total_count,
    MIN(visit_date) as first_date
  FROM visitor_stats
)
UPDATE visitor_stats_cache
SET 
  today = (SELECT today_count FROM stats),
  yesterday = (SELECT yesterday_count FROM stats),
  last_7_days = (SELECT last_7_days_count FROM stats),
  last_30_days = (SELECT last_30_days_count FROM stats),
  last_365_days = (SELECT last_365_days_count FROM stats),
  total_visits = (SELECT total_count FROM stats),
  first_visit_date = (SELECT first_date FROM stats),
  updated_at = NOW()
WHERE cache_key = 'summary';
```

또는 `manual-update-visitor-cache.sql` 파일 실행

## 🔧 진단 방법

### 1. 현재 캐시 상태 확인
```sql
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';
```

### 2. 오늘 실제 방문자 수 확인
```sql
SELECT 
  CURRENT_DATE as visit_date,
  SUM(visit_count) as actual_today_count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE;
```

### 3. 오늘 시간대별 데이터 확인
```sql
SELECT 
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;
```

전체 진단 SQL: `diagnose-today-visitor-count.sql` 파일 실행

## 📊 정상 작동 확인

1. **캐시 업데이트 시간 확인**:
   - `updated_at`이 최근 30분 이내여야 함
   - 30분 이상 지났다면 Edge Function이 작동하지 않는 것

2. **오늘 방문자 수 비교**:
   - 캐시의 `today` 값
   - 실제 DB의 `SUM(visit_count)` 값
   - 두 값이 일치해야 함

3. **프론트엔드 확인**:
   - 관리자 페이지 → 방문자 통계
   - "오늘" 숫자가 0이 아니고 실제 방문 수와 일치하는지 확인

## 🚀 배포 및 적용

### 1. Edge Function 재배포
```bash
cd hokex-front
git add supabase/functions/update-visitor-stats-cache/index.ts
git commit -m "fix: 오늘 방문자 수 집계 버그 수정 (visit_hour 포함)"
git push origin main

# Supabase CLI로 배포
supabase functions deploy update-visitor-stats-cache
```

### 2. 즉시 캐시 업데이트
```sql
-- Supabase Dashboard → SQL Editor에서 실행
-- manual-update-visitor-cache.sql 파일의 5번 쿼리 실행
```

### 3. 프론트엔드 새로고침
- 관리자 페이지 새로고침 (Ctrl+F5)
- 캐시 클리어 후 재접속

## 📝 예방 조치

### 1. 모니터링 설정
- 매일 오전 캐시 업데이트 시간 확인
- `updated_at`이 30분 이상 지났으면 알림

### 2. 백업 스크립트
- `manual-update-visitor-cache.sql`을 정기적으로 실행
- 문제 발생 시 즉시 복구 가능

### 3. Edge Function 로그 확인
```bash
supabase functions logs update-visitor-stats-cache
```

## 🔗 관련 파일

- `supabase/functions/update-visitor-stats-cache/index.ts` - Edge Function (수정됨)
- `src/utils/detailedAnalytics.ts` - 프론트엔드 추적 코드
- `supabase-migrations/create-visitor-stats-cache.sql` - 캐시 테이블 스키마
- `diagnose-today-visitor-count.sql` - 진단 SQL
- `manual-update-visitor-cache.sql` - 수동 업데이트 SQL

## ✅ 완료 체크리스트

- [ ] Edge Function 코드 수정 확인
- [ ] Edge Function 재배포
- [ ] SQL로 캐시 수동 업데이트
- [ ] 프론트엔드에서 오늘 방문자 수 정상 표시 확인
- [ ] 30분 후 자동 업데이트 작동 확인
- [ ] 문서 작성 완료

## 🆘 문제가 계속되면

1. **Edge Function 로그 확인**:
```bash
supabase functions logs update-visitor-stats-cache --tail
```

2. **pg_cron 작업 확인**:
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%visitor%';
```

3. **RLS 정책 확인**:
```sql
SELECT * FROM pg_policies WHERE tablename = 'visitor_stats_cache';
```

4. **수동으로 캐시 업데이트 반복**:
   - `manual-update-visitor-cache.sql` 실행
   - 문제가 해결될 때까지 반복
