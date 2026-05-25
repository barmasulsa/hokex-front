-- ============================================
-- 조회수 불일치 진단 쿼리
-- ============================================

-- 1. increment_event_view_count 함수 확인
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'increment_event_view_count';

-- 2. 특정 행사의 누적 조회수 vs 기간별 조회수 비교
-- "2026 나주곶 워크" 행사 찾기
SELECT 
  id,
  title,
  venue,
  region,
  view_count as cumulative_count,
  start_date,
  end_date
FROM events
WHERE title LIKE '%나주곶%'
  AND deleted_at IS NULL;

-- 3. 해당 행사의 event_views_log 확인
SELECT 
  e.id,
  e.title,
  e.view_count as cumulative_count,
  COUNT(evl.id) as total_log_count,
  COUNT(CASE WHEN evl.viewed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days_count,
  COUNT(CASE WHEN evl.viewed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days_count,
  COUNT(CASE WHEN evl.viewed_at >= CURRENT_DATE THEN 1 END) as today_count
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
WHERE e.title LIKE '%나주곶%'
  AND e.deleted_at IS NULL
GROUP BY e.id, e.title, e.view_count;

-- 4. 최근 조회 로그 확인 (최근 10개)
SELECT 
  evl.id,
  evl.event_id,
  e.title,
  evl.viewed_at,
  evl.user_id,
  evl.created_at
FROM event_views_log evl
JOIN events e ON e.id = evl.event_id
WHERE e.title LIKE '%나주곶%'
ORDER BY evl.viewed_at DESC
LIMIT 10;

-- 5. 전체 통계 비교
SELECT 
  'events 테이블 총 조회수' as 구분,
  SUM(view_count)::TEXT as 값
FROM events
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'event_views_log 총 로그 수' as 구분,
  COUNT(*)::TEXT as 값
FROM event_views_log
UNION ALL
SELECT 
  '불일치 행사 수 (cumulative < log)' as 구분,
  COUNT(*)::TEXT as 값
FROM (
  SELECT 
    e.id,
    e.view_count as cumulative,
    COUNT(evl.id) as log_count
  FROM events e
  LEFT JOIN event_views_log evl ON e.id = evl.event_id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, e.view_count
  HAVING e.view_count < COUNT(evl.id)
) mismatches;

-- 6. 불일치 행사 목록 (상위 10개)
SELECT 
  e.id,
  e.title,
  e.venue,
  e.view_count as cumulative_count,
  COUNT(evl.id) as log_count,
  (COUNT(evl.id) - e.view_count) as difference
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.venue, e.view_count
HAVING e.view_count < COUNT(evl.id)
ORDER BY (COUNT(evl.id) - e.view_count) DESC
LIMIT 10;

-- 7. 함수 실행 테스트 (실제로 실행하지 말 것! 조회만 할 것)
-- SELECT increment_event_view_count('행사ID', NULL);
