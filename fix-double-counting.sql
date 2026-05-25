-- ============================================
-- 중복 카운팅 문제 해결
-- 마이그레이션된 어제 날짜 로그를 삭제하고 재동기화
-- ============================================

-- 1. 현재 상태 확인
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

-- 2. 어제 날짜(2026-05-24)의 마이그레이션 로그 삭제
DELETE FROM event_views_log
WHERE DATE(viewed_at) = '2026-05-24'
  AND user_id IS NULL;  -- 마이그레이션된 로그는 user_id가 NULL

-- 3. 삭제 후 상태 확인
SELECT 
  'events 테이블 총 조회수' as 구분,
  SUM(view_count)::TEXT as 값
FROM events
WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'event_views_log 남은 로그 수' as 구분,
  COUNT(*)::TEXT as 값
FROM event_views_log;

-- 4. 누적 조회수 재동기화
UPDATE events e
SET view_count = (
  SELECT COUNT(*)
  FROM event_views_log evl
  WHERE evl.event_id = e.id
)
WHERE e.deleted_at IS NULL;

-- 5. 최종 결과 확인
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

-- 6. 상위 10개 행사 조회수 확인
SELECT 
  e.title,
  e.venue,
  e.view_count as cumulative_count,
  COUNT(evl.id) as log_count
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.venue, e.view_count
ORDER BY e.view_count DESC
LIMIT 10;
