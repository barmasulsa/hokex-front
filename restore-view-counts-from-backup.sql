-- ============================================
-- 조회수 복구 스크립트
-- 기존 view_count를 다시 event_views_log에 복사
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

-- 2. 기존 조회수를 어제 날짜로 다시 마이그레이션
-- (이번에는 view_count를 0으로 리셋하지 않음)
DO $$
DECLARE
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  event_record RECORD;
  view_index INTEGER;
  random_hour INTEGER;
  random_minute INTEGER;
  random_second INTEGER;
  view_timestamp TIMESTAMPTZ;
  total_events INTEGER := 0;
  total_views INTEGER := 0;
BEGIN
  RAISE NOTICE '기존 조회수 복구 시작 (어제 날짜: %)', yesterday_date;
  
  -- 조회수가 있는 모든 행사를 순회
  FOR event_record IN 
    SELECT id, view_count 
    FROM events 
    WHERE view_count > 0
      AND deleted_at IS NULL
  LOOP
    total_events := total_events + 1;
    
    -- 각 행사의 조회수만큼 로그 생성
    FOR view_index IN 1..event_record.view_count LOOP
      -- 어제 하루 중 랜덤한 시각 생성
      random_hour := floor(random() * 24)::INTEGER;
      random_minute := floor(random() * 60)::INTEGER;
      random_second := floor(random() * 60)::INTEGER;
      
      view_timestamp := yesterday_date + 
                       (random_hour || ' hours')::INTERVAL + 
                       (random_minute || ' minutes')::INTERVAL + 
                       (random_second || ' seconds')::INTERVAL;
      
      -- 조회 로그 삽입
      INSERT INTO event_views_log (event_id, viewed_at, user_id)
      VALUES (
        event_record.id,
        view_timestamp,
        NULL
      );
      
      total_views := total_views + 1;
    END LOOP;
    
    -- 진행 상황 출력 (100개마다)
    IF total_events % 100 = 0 THEN
      RAISE NOTICE '  처리 중... % 행사 완료', total_events;
    END IF;
  END LOOP;
  
  RAISE NOTICE '복구 완료: % 행사의 총 % 조회수 복구', total_events, total_views;
END $$;

-- 3. 복구 결과 확인
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

-- 4. 상위 10개 행사 확인
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
