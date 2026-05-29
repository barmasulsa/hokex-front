-- ============================================
-- "어제" 데이터가 왜 3일로 표시되는지 확인
-- ============================================

-- 1. 현재 비즈니스 날짜 확인
SELECT 
  get_business_date() AS "비즈니스_오늘",
  get_business_date() - INTERVAL '1 day' AS "비즈니스_어제",
  CURRENT_DATE AS "실제_오늘",
  CURRENT_DATE - INTERVAL '1 day' AS "실제_어제",
  EXTRACT(HOUR FROM NOW()) AS "현재_시간";

-- 2. visitor_stats 테이블의 실제 데이터 확인 (최근 5일)
SELECT 
  visit_date AS "방문_날짜",
  COUNT(DISTINCT visitor_id) AS "고유_방문자수",
  SUM(visit_count) AS "총_방문수"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '5 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 3. 캐시에 저장된 "어제" 값 확인
SELECT 
  period,
  visitor_count,
  last_updated
FROM visitor_stats_cache
WHERE period = 'yesterday';

-- 4. 실제 "어제" 데이터 계산 (비즈니스 날짜 기준)
WITH business_dates AS (
  SELECT 
    get_business_date() AS today,
    get_business_date() - INTERVAL '1 day' AS yesterday
)
SELECT 
  bd.yesterday AS "비즈니스_어제",
  COALESCE(COUNT(DISTINCT vs.visitor_id), 0) AS "실제_어제_방문자수"
FROM business_dates bd
LEFT JOIN visitor_stats vs ON vs.visit_date = bd.yesterday
GROUP BY bd.yesterday;

-- 5. update_visitor_smart_cache 함수가 어떻게 계산하는지 확인
-- (함수 내부 로직을 직접 실행)
WITH business_dates AS (
  SELECT 
    get_business_date() AS business_today
),
yesterday_calc AS (
  SELECT 
    bd.business_today,
    (bd.business_today - INTERVAL '1 day')::DATE AS business_yesterday
  FROM business_dates bd
)
SELECT 
  yc.business_today AS "오늘",
  yc.business_yesterday AS "어제",
  COALESCE(COUNT(DISTINCT vs.visitor_id), 0) AS "어제_방문자수"
FROM yesterday_calc yc
LEFT JOIN visitor_stats vs ON vs.visit_date = yc.business_yesterday
GROUP BY yc.business_today, yc.business_yesterday;
