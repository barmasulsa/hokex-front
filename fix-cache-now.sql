-- ============================================
-- 캐시 즉시 수정
-- ============================================

-- 1단계: 현재 캐시 상태 확인
SELECT 
  '수정 전 캐시 상태' AS step,
  cache_type,
  visit_count,
  last_updated
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 2단계: 실제 데이터 확인
SELECT 
  '실제 데이터' AS step,
  DATE(created_at) AS date,
  COUNT(*) AS count
FROM visitor_stats
WHERE DATE(created_at) >= '2026-05-22'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- 3단계: 캐시 강제 업데이트 (정확한 값으로)
UPDATE visitor_stats_smart_cache
SET 
  visit_count = (
    SELECT COUNT(*)
    FROM visitor_stats
    WHERE DATE(created_at) = get_business_date() - INTERVAL '1 day'
  ),
  last_updated = NOW()
WHERE cache_type = 'yesterday';

UPDATE visitor_stats_smart_cache
SET 
  visit_count = (
    SELECT COUNT(*)
    FROM visitor_stats
    WHERE DATE(created_at) = get_business_date()
  ),
  last_updated = NOW()
WHERE cache_type = 'today';

UPDATE visitor_stats_smart_cache
SET 
  visit_count = (
    SELECT COUNT(*)
    FROM visitor_stats
    WHERE DATE(created_at) >= get_business_date() - INTERVAL '7 days'
  ),
  last_updated = NOW()
WHERE cache_type = 'last_7_days';

UPDATE visitor_stats_smart_cache
SET 
  visit_count = (
    SELECT COUNT(*)
    FROM visitor_stats
    WHERE DATE(created_at) >= get_business_date() - INTERVAL '30 days'
  ),
  last_updated = NOW()
WHERE cache_type = 'last_30_days';

UPDATE visitor_stats_smart_cache
SET 
  visit_count = (
    SELECT COUNT(*)
    FROM visitor_stats
    WHERE DATE(created_at) >= get_business_date() - INTERVAL '365 days'
  ),
  last_updated = NOW()
WHERE cache_type = 'last_365_days';

-- 4단계: 수정 후 캐시 상태 확인
SELECT 
  '수정 후 캐시 상태' AS step,
  cache_type,
  visit_count,
  last_updated
FROM visitor_stats_smart_cache
ORDER BY cache_type;

-- 5단계: 검증 - 실제 데이터와 캐시 비교
SELECT 
  '검증: 어제 데이터' AS step,
  (SELECT COUNT(*) FROM visitor_stats WHERE DATE(created_at) = get_business_date() - INTERVAL '1 day') AS "실제_어제",
  (SELECT visit_count FROM visitor_stats_smart_cache WHERE cache_type = 'yesterday') AS "캐시_어제",
  get_business_date() - INTERVAL '1 day' AS "어제_날짜";
