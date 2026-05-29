-- ============================================
-- 방문자 통계 캐시 날짜 계산 수정
-- ============================================
-- 
-- 문제: 오늘(5/29) 기준으로 어제(5/28)가 아닌 5/27이 표시됨
-- 원인: 캐시 업데이트 로직의 날짜 계산 오류
-- 해결: 올바른 날짜로 강제 업데이트
-- ============================================

-- 1. 현재 상태 확인
SELECT 
  '=== 현재 캐시 상태 (잘못됨) ===' as status,
  CURRENT_DATE as "오늘날짜",
  CURRENT_DATE - INTERVAL '1 day' as "어제날짜",
  today as "캐시_오늘",
  yesterday as "캐시_어제",
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 2. 실제 데이터 확인
SELECT 
  '=== 실제 데이터 ===' as status,
  visit_date as "날짜",
  SUM(visit_count) as "방문수",
  CASE 
    WHEN visit_date = CURRENT_DATE THEN '← 오늘 (5/29)'
    WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN '← 어제 (5/28)'
    WHEN visit_date = CURRENT_DATE - INTERVAL '2 days' THEN '← 그저께 (5/27)'
    ELSE ''
  END as "설명"
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 3. 캐시 강제 업데이트 (올바른 날짜 계산)
WITH stats AS (
  SELECT 
    -- 오늘 (5/29)
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE THEN visit_count ELSE 0 END), 0) as today_count,
    -- 어제 (5/28) - 이게 1명이어야 함
    COALESCE(SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN visit_count ELSE 0 END), 0) as yesterday_count,
    -- 최근 7일
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

-- 4. 업데이트 후 확인
SELECT 
  '=== ✅ 수정 완료 ===' as status,
  CURRENT_DATE as "오늘날짜_5월29일",
  today as "캐시_오늘",
  yesterday as "캐시_어제_1명이어야함",
  last_7_days as "최근7일",
  updated_at as "업데이트시간"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 5. 검증: 날짜별 실제 데이터와 비교
SELECT 
  '=== 검증: 5/28 데이터 ===' as status,
  visit_date,
  SUM(visit_count) as count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY visit_date;

