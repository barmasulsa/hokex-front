-- ============================================
-- 누적 조회수 동기화 스크립트 (간소화 버전)
-- event_views_log의 실제 로그 수와 events.view_count를 일치시킴
-- ============================================

-- 1. 현재 불일치 상태 확인
SELECT 
  '동기화 전 불일치 행사 수' as 구분,
  COUNT(*) as 개수
FROM (
  SELECT 
    e.id,
    e.view_count as cumulative,
    COUNT(evl.id) as log_count
  FROM events e
  LEFT JOIN event_views_log evl ON e.id = evl.event_id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, e.view_count
  HAVING e.view_count != COUNT(evl.id)
) mismatches;

-- 2. 불일치 행사 목록 출력 (동기화 전)
SELECT 
  e.id,
  e.title,
  e.venue,
  e.view_count as current_cumulative,
  COUNT(evl.id) as actual_log_count,
  (COUNT(evl.id) - e.view_count) as difference
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.venue, e.view_count
HAVING e.view_count != COUNT(evl.id)
ORDER BY ABS(COUNT(evl.id) - e.view_count) DESC
LIMIT 20;

-- 3. 누적 조회수 동기화 실행 ⭐ 핵심 쿼리
UPDATE events e
SET view_count = (
  SELECT COUNT(*)
  FROM event_views_log evl
  WHERE evl.event_id = e.id
)
WHERE e.deleted_at IS NULL;

-- 4. 동기화 결과 확인
SELECT 
  '동기화 후 불일치 행사 수' as 구분,
  COUNT(*) as 개수
FROM (
  SELECT 
    e.id,
    e.view_count as cumulative,
    COUNT(evl.id) as log_count
  FROM events e
  LEFT JOIN event_views_log evl ON e.id = evl.event_id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, e.view_count
  HAVING e.view_count != COUNT(evl.id)
) mismatches;

-- 5. "나주곶" 행사 확인
SELECT 
  e.id,
  e.title,
  e.venue,
  e.view_count as cumulative_count,
  COUNT(evl.id) as log_count,
  COUNT(CASE WHEN evl.viewed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
WHERE e.title LIKE '%나주곶%'
  AND e.deleted_at IS NULL
GROUP BY e.id, e.title, e.venue, e.view_count;

-- 6. 전체 통계 확인
SELECT 
  'events 테이블 총 조회수' as 구분,
  SUM(view_count)::TEXT as 값
FROM events
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'event_views_log 총 로그 수' as 구분,
  COUNT(*)::TEXT as 값
FROM event_views_log;
