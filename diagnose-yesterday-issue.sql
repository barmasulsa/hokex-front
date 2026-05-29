-- ============================================
-- 어제 데이터가 3명으로 돌아간 이유 진단
-- ============================================

-- 1. 현재 시간과 비즈니스 날짜 확인
SELECT 
  '=== 현재 시간 정보 ===' as info,
  NOW() AS current_time,
  EXTRACT(HOUR FROM NOW()) AS current_hour,
  get_business_date() AS business_date,
  get_business_date() - INTERVAL '1 day' AS business_yesterday;

-- 2. visitor_stats 테이블의 실제 데이터 확인
SELECT 
  '=== visitor_stats 실제 데이터 ===' as info,
  visit_date,
  SUM(visit_count) as total_count
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 3. 어제 날짜의 상세 데이터
SELECT 
  '=== 어제 상세 데이터 ===' as info,
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY visit_hour;

-- 4. 캐시 테이블 상태 확인
SELECT 
  '=== visitor_stats_cache 상태 ===' as info,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 5. 스마트 캐시 테이블 상태 확인
SELECT 
  '=== visitor_stats_smart_cache 상태 ===' as info,
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS age
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 6. 비즈니스 날짜 기준으로 어제 데이터 계산
SELECT 
  '=== 비즈니스 날짜 기준 어제 ===' as info,
  get_business_date() - INTERVAL '1 day' AS business_yesterday,
  COALESCE(SUM(visit_count), 0) AS yesterday_count
FROM visitor_stats
WHERE visit_date = get_business_date() - INTERVAL '1 day';

-- 7. 일반 날짜 기준으로 어제 데이터 계산
SELECT 
  '=== 일반 날짜 기준 어제 ===' as info,
  CURRENT_DATE - INTERVAL '1 day' AS calendar_yesterday,
  COALESCE(SUM(visit_count), 0) AS yesterday_count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day';

-- 8. 캐시 업데이트 함수가 사용하는 로직 테스트
DO $$
DECLARE
  business_today DATE := get_business_date();
  business_yesterday DATE := business_today - INTERVAL '1 day';
  yesterday_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(visit_count), 0) INTO yesterday_count
  FROM visitor_stats
  WHERE visit_date = business_yesterday;
  
  RAISE NOTICE '비즈니스 오늘: %', business_today;
  RAISE NOTICE '비즈니스 어제: %', business_yesterday;
  RAISE NOTICE '어제 방문자 수: %', yesterday_count;
END $$;

-- 9. 최근 캐시 업데이트 로그 확인 (있다면)
SELECT 
  '=== 캐시 업데이트 로그 ===' as info,
  today_count,
  yesterday_count,
  business_date,
  updated_at
FROM visitor_cache_update_log
ORDER BY updated_at DESC
LIMIT 10;

-- 10. Cron job 상태 확인
SELECT 
  '=== Cron Job 상태 ===' as info,
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%visitor%'
ORDER BY jobname;
