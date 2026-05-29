# 방문자 통계 캐시 자동 업데이트 설정 가이드

## 문제 상황
- 밤 12시가 지나도 통계가 자동으로 업데이트되지 않음
- Supabase Cron Job이 제대로 작동하지 않는 것으로 보임

## 해결 방법: Database Trigger 사용

Cron Job 대신 **Database Trigger**를 사용하여 `visitor_stats` 테이블에 새 데이터가 추가될 때마다 자동으로 캐시를 업데이트합니다.

### 1단계: Supabase SQL Editor에서 실행

```sql
-- ============================================
-- 방문자 통계 캐시 자동 업데이트 (Trigger 방식)
-- ============================================

-- 1. 캐시 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_visitor_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- visitor_stats에 변경이 있을 때마다 캐시 업데이트
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 기존 트리거 삭제 (있다면)
DROP TRIGGER IF EXISTS trigger_update_visitor_cache ON visitor_stats;

-- 3. 트리거 생성 (INSERT 또는 UPDATE 시 실행)
CREATE TRIGGER trigger_update_visitor_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH ROW
EXECUTE FUNCTION update_visitor_cache();

-- 4. 초기 캐시 업데이트 (즉시 실행)
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
WHERE cache_key = 'summary'
RETURNING 
  '✅ 캐시 업데이트 완료' as status,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  updated_at as "업데이트시간";

-- 5. 설정 확인
SELECT 
  '=== 트리거 설정 확인 ===' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_visitor_cache';
```

### 2단계: 작동 원리

1. **자동 업데이트**: 사용자가 홈페이지를 방문하면
   - `recordDetailedVisit()` 함수가 `visitor_stats` 테이블에 데이터 추가
   - Trigger가 자동으로 `update_visitor_cache()` 함수 실행
   - 캐시가 즉시 업데이트됨

2. **날짜 변경 시**: 밤 12시가 지나면
   - 첫 방문자가 접속할 때 새로운 날짜로 데이터 추가
   - Trigger가 자동으로 실행되어 "오늘"과 "어제" 통계 업데이트

### 3단계: 테스트

```sql
-- 테스트: 현재 캐시 상태 확인
SELECT 
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  updated_at as "마지막업데이트"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 테스트: 트리거 작동 확인 (테스트 데이터 추가)
-- 주의: 실제 통계에 영향을 주므로 필요시에만 실행
-- INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
-- VALUES (CURRENT_DATE, EXTRACT(HOUR FROM NOW()), 1)
-- ON CONFLICT (visit_date, visit_hour) 
-- DO UPDATE SET visit_count = visitor_stats.visit_count + 1;
```

## 장점

1. **즉시 반영**: 방문자가 있을 때마다 자동으로 캐시 업데이트
2. **Cron 불필요**: Supabase Cron Job 설정 필요 없음
3. **확실한 작동**: Database Trigger는 매우 안정적
4. **날짜 변경 자동 처리**: 밤 12시 이후 첫 방문자가 자동으로 통계 업데이트

## 주의사항

- Trigger는 `visitor_stats` 테이블에 변경이 있을 때만 실행됩니다
- 방문자가 없는 날에는 캐시가 업데이트되지 않지만, 다음 방문자가 오면 자동으로 업데이트됩니다
- 성능 영향은 거의 없습니다 (캐시 테이블은 단일 행만 업데이트)

## 문제 해결

### 캐시가 업데이트되지 않는 경우

```sql
-- 수동으로 캐시 강제 업데이트
WITH stats AS (
  SELECT 
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN visit_count ELSE 0 END), 0) as last_7_days_count,
    COALESCE(SUM(CASE WHEN visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN visit_count ELSE 0 END), 0) as last_30_days_count
  FROM visitor_stats
)
UPDATE visitor_stats_cache
SET 
  today = (SELECT today_count FROM stats),
  yesterday = (SELECT yesterday_count FROM stats),
  last_7_days = (SELECT last_7_days_count FROM stats),
  last_30_days = (SELECT last_30_days_count FROM stats),
  updated_at = NOW()
WHERE cache_key = 'summary'
RETURNING today, yesterday, last_7_days, last_30_days, updated_at;
```

## 완료!

이제 방문자 통계가 자동으로 실시간 업데이트됩니다. 🎉
