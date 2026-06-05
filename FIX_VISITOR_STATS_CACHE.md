# 방문객 통계 캐시 수정 가이드

## 문제 상황
- 로컬: 최신 통계 표시 (실시간 DB 조회)
- 배포: 캐시와 실시간 DB 조회 결과 불일치 → DB에 새로운 방문 데이터가 없음

## 원인
1. **Edge Function 날짜 문제**: UTC 기준으로 작동하여 KST와 날짜 불일치
2. **캐시 업데이트 미실행**: 캐시가 오래되어 0명으로 표시됨

## 해결 방법

### 1단계: Edge Function 재배포 (KST 적용)

```bash
cd hokex-front
supabase functions deploy update-visitor-stats-cache
```

### 2단계: 캐시 즉시 업데이트

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 캐시 수동 업데이트
SELECT update_visitor_stats_cache_full();
```

또는 Edge Function 직접 호출:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}'
```

### 3단계: 결과 확인

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 1. 캐시 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at,
  NOW() - updated_at as cache_age
FROM visitor_stats_cache;

-- 2. 실제 데이터 확인 (KST 기준)
WITH kst_now AS (
  SELECT 
    (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE as today,
    ((NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::DATE as yesterday
)
SELECT 
  'today' as period,
  vs.visit_date,
  SUM(vs.visit_count) as total_visits
FROM visitor_stats vs, kst_now
WHERE vs.visit_date = kst_now.today
GROUP BY vs.visit_date

UNION ALL

SELECT 
  'yesterday' as period,
  vs.visit_date,
  SUM(vs.visit_count) as total_visits
FROM visitor_stats vs, kst_now
WHERE vs.visit_date = kst_now.yesterday
GROUP BY vs.visit_date;
```

### 4단계: 자동 업데이트 설정 확인

pg_cron 스케줄러 확인:

```sql
-- 스케줄 조회
SELECT * FROM cron.job 
WHERE jobname LIKE '%visitor%';

-- 실행 로그 확인
SELECT * FROM cron.job_run_details 
WHERE jobname LIKE '%visitor%' 
ORDER BY start_time DESC 
LIMIT 10;
```

스케줄이 없으면 추가:

```sql
-- 30분마다: 오늘 방문자 수 업데이트
SELECT cron.schedule(
  'update-visitor-cache-today',
  '*/30 * * * *', -- 30분마다
  $$ 
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"type":"today"}'::jsonb
  );
  $$
);

-- 새벽 4시: 전체 통계 업데이트 (KST 기준)
SELECT cron.schedule(
  'update-visitor-cache-full',
  '0 19 * * *', -- UTC 19:00 = KST 04:00
  $$ 
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"type":"full"}'::jsonb
  );
  $$
);
```

## 추가 확인 사항

### 방문 기록이 아예 없는 경우

```sql
-- visitor_stats 테이블에 데이터가 있는지 확인
SELECT COUNT(*) as total_records,
       MIN(visit_date) as first_visit,
       MAX(visit_date) as last_visit
FROM visitor_stats;

-- 최근 5일 방문 기록 확인
SELECT visit_date, SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '5 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
```

데이터가 없으면:
1. 프론트엔드의 `recordDetailedVisit()` 함수가 실행되는지 확인
2. RPC 함수 `increment_visitor_stat`이 정상 동작하는지 확인

```sql
-- RPC 함수 테스트
SELECT increment_visitor_stat(
  p_visit_date := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE,
  p_visit_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'))::INTEGER
);
```

## 문제 해결 체크리스트

- [ ] Edge Function을 KST 기준으로 수정하고 재배포했는가?
- [ ] 캐시를 수동으로 업데이트했는가?
- [ ] 캐시 테이블에 데이터가 올바르게 저장되었는가?
- [ ] visitor_stats 테이블에 오늘/어제 데이터가 있는가?
- [ ] pg_cron 스케줄러가 설정되어 있는가?
- [ ] 프론트엔드에서 `recordDetailedVisit()`이 실행되는가?

## 완료 후 예상 결과

배포 환경에서:
- **오늘**: 실제 방문자 수 표시
- **어제**: 1명 (어제 방문 기록이 있는 경우)
- **최근 7일/30일**: 실제 통계 표시

로컬 환경:
- 동일하게 실시간 DB 데이터 표시
