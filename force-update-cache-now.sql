-- ============================================
-- 캐시 강제 업데이트 및 상태 확인
-- ============================================

-- 1. 현재 캐시 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%visitor%' AND table_schema = 'public';

-- 2. visitor_stats_smart_cache 테이블 상태 확인
SELECT 
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS "얼마나 오래됐는지"
FROM visitor_stats_smart_cache
ORDER BY 
  CASE cache_type
    WHEN 'today' THEN 1
    WHEN 'yesterday' THEN 2
    WHEN 'weekly' THEN 3
    WHEN 'monthly' THEN 4
  END;

-- 2. 현재 비즈니스 날짜 확인
SELECT 
  get_business_date() AS "비즈니스_날짜",
  CURRENT_DATE AS "실제_날짜",
  EXTRACT(HOUR FROM NOW()) AS "현재_시간";

-- 3. 실제 visitor_stats 데이터 확인 (최근 5일)
SELECT 
  DATE(created_at) AS "날짜",
  COUNT(DISTINCT visitor_id) AS "방문자수"
FROM visitor_stats
WHERE created_at >= CURRENT_DATE - INTERVAL '5 days'
GROUP BY DATE(created_at)
ORDER BY "날짜" DESC;

-- 4. 캐시 강제 업데이트 실행
SELECT update_visitor_smart_cache();

-- 5. 업데이트 후 캐시 재확인
SELECT 
  cache_type,
  visit_count,
  last_updated
FROM visitor_stats_smart_cache
ORDER BY 
  CASE cache_type
    WHEN 'today' THEN 1
    WHEN 'yesterday' THEN 2
    WHEN 'weekly' THEN 3
    WHEN 'monthly' THEN 4
  END;

-- 6. Cron Job 상태 확인
SELECT 
  jobname,
  schedule,
  active,
  command,
  nodename
FROM cron.job
WHERE jobname LIKE '%visitor%'
ORDER BY jobname;
