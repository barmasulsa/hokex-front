-- 방문자 통계 진단 (한 번에 모든 결과 보기)

-- 1. 캐시 현황
SELECT 
  '캐시현황' as 구분,
  cache_key as 키,
  today as 오늘,
  yesterday as 어제,
  last_7_days as 최근7일,
  last_30_days as 최근30일,
  updated_at::text as 캐시수정시각,
  ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60, 1) as 경과분
FROM visitor_stats_cache
WHERE cache_key = 'summary'

UNION ALL

-- 2. 오늘 실제 데이터
SELECT 
  '오늘실제' as 구분,
  NULL as 키,
  COALESCE(SUM(visit_count), 0)::integer as 오늘,
  NULL as 어제,
  NULL as 최근7일,
  NULL as 최근30일,
  NULL as 캐시수정시각,
  NULL as 경과분
FROM visitor_stats
WHERE visit_date = CURRENT_DATE

UNION ALL

-- 3. 어제 실제 데이터
SELECT 
  '어제실제' as 구분,
  NULL as 키,
  NULL as 오늘,
  COALESCE(SUM(visit_count), 0)::integer as 어제,
  NULL as 최근7일,
  NULL as 최근30일,
  NULL as 캐시수정시각,
  NULL as 경과분
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - INTERVAL '1 day'

UNION ALL

-- 4. 최근 7일 실제 데이터
SELECT 
  '최근7일실제' as 구분,
  NULL as 키,
  NULL as 오늘,
  NULL as 어제,
  COALESCE(SUM(visit_count), 0)::integer as 최근7일,
  NULL as 최근30일,
  NULL as 캐시수정시각,
  NULL as 경과분
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

-- 5. 최근 1시간 데이터 개수
SELECT 
  '최근1시간' as 구분,
  NULL as 키,
  COUNT(*)::integer as 오늘,
  NULL as 어제,
  NULL as 최근7일,
  NULL as 최근30일,
  '레코드개수' as 캐시수정시각,
  NULL as 경과분
FROM visitor_stats
WHERE created_at >= NOW() - INTERVAL '1 hour'

ORDER BY 구분;
