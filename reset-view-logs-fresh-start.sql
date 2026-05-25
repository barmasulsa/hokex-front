-- ============================================
-- 조회수 로그 시스템 초기화 및 새로 시작
-- 기존 데이터를 모두 정리하고 오늘부터 새로 시작
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

-- 2. event_views_log 테이블 완전 초기화
TRUNCATE TABLE event_views_log;

-- 3. events 테이블의 view_count도 0으로 리셋
UPDATE events 
SET view_count = 0
WHERE deleted_at IS NULL;

-- 4. 초기화 결과 확인
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

-- 5. 시스템 상태 확인
SELECT 
  '초기화 완료' as 상태,
  '오늘부터 새로운 조회수 집계 시작' as 메시지,
  CURRENT_DATE as 시작일;
