-- ============================================
-- 방문자 통계 캐시 문제 진단
-- ============================================

-- 1단계: visitor_stats 테이블 구조 확인
SELECT 
  '1. visitor_stats 테이블 구조' AS step,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'visitor_stats'
ORDER BY ordinal_position;

-- 2단계: visitor_stats 테이블의 실제 데이터 확인
SELECT 
  '2. visitor_stats 최근 데이터' AS step,
  *
FROM visitor_stats
ORDER BY created_at DESC
LIMIT 10;

-- 3단계: 캐시 테이블들 확인
SELECT 
  '3. visitor_stats_smart_cache 상태' AS step,
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS "업데이트된지 얼마나 지났는지"
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 4단계: 현재 비즈니스 날짜 확인
SELECT 
  '4. 현재 비즈니스 날짜' AS step,
  NOW() AS "현재시각",
  EXTRACT(HOUR FROM NOW()) AS "현재시간",
  get_business_date() AS "비즈니스날짜",
  get_business_date() - INTERVAL '1 day' AS "어제",
  CASE 
    WHEN EXTRACT(HOUR FROM NOW()) < 4 THEN '전날로 계산됨 (새벽 0~3시)'
    ELSE '오늘로 계산됨 (새벽 4시 이후)'
  END AS "날짜계산로직";

-- 5단계: cron job 상태 확인
SELECT 
  '5. 자동 업데이트 스케줄 상태' AS step,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%visitor%'
ORDER BY jobname;

-- 6단계: 실제 데이터와 캐시 비교
WITH real_today AS (
  SELECT 
    COUNT(*) AS count
  FROM visitor_stats
  WHERE DATE(created_at) = get_business_date()
),
cache_today AS (
  SELECT visit_count
  FROM visitor_stats_smart_cache
  WHERE cache_type = 'today'
)
SELECT 
  '6. 오늘 데이터 비교' AS step,
  r.count AS "실제_오늘_방문자수",
  c.visit_count AS "캐시_오늘_방문자수",
  r.count - c.visit_count AS "차이"
FROM real_today r
CROSS JOIN cache_today c;

-- 7단계: 어제 데이터 확인
WITH real_yesterday AS (
  SELECT 
    COUNT(*) AS count
  FROM visitor_stats
  WHERE DATE(created_at) = get_business_date() - INTERVAL '1 day'
),
cache_yesterday AS (
  SELECT visit_count
  FROM visitor_stats_smart_cache
  WHERE cache_type = 'yesterday'
)
SELECT 
  '7. 어제 데이터 비교' AS step,
  r.count AS "실제_어제_방문자수",
  c.visit_count AS "캐시_어제_방문자수",
  r.count - c.visit_count AS "차이",
  get_business_date() - INTERVAL '1 day' AS "어제날짜"
FROM real_yesterday r
CROSS JOIN cache_yesterday c;

-- 8단계: 최근 7일간 날짜별 방문자 수
SELECT 
  '8. 최근 7일 날짜별 방문자' AS step,
  DATE(created_at) AS "날짜",
  COUNT(*) AS "방문자수"
FROM visitor_stats
WHERE DATE(created_at) >= get_business_date() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
