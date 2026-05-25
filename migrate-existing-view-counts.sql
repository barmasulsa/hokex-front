-- 기존 조회수를 어제 날짜로 event_views_log에 마이그레이션
-- 주의: 이 스크립트는 한 번만 실행해야 합니다.

DO $$
DECLARE
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  event_record RECORD;
  view_index INTEGER;
  random_hour INTEGER;
  random_minute INTEGER;
  random_second INTEGER;
  view_timestamp TIMESTAMPTZ;
BEGIN
  -- 조회수가 있는 모든 행사를 순회
  FOR event_record IN 
    SELECT id, view_count 
    FROM events 
    WHERE view_count > 0
  LOOP
    -- 각 행사의 조회수만큼 로그 생성
    FOR view_index IN 1..event_record.view_count LOOP
      -- 어제 하루 중 랜덤한 시각 생성 (00:00:00 ~ 23:59:59)
      random_hour := floor(random() * 24)::INTEGER;
      random_minute := floor(random() * 60)::INTEGER;
      random_second := floor(random() * 60)::INTEGER;
      
      view_timestamp := yesterday_date + 
                       (random_hour || ' hours')::INTERVAL + 
                       (random_minute || ' minutes')::INTERVAL + 
                       (random_second || ' seconds')::INTERVAL;
      
      -- 조회 로그 삽입
      INSERT INTO event_views_log (event_id, viewed_at, user_id, ip_address, user_agent)
      VALUES (
        event_record.id,
        view_timestamp,
        NULL,  -- 기존 데이터는 사용자 정보 없음
        NULL,  -- IP 주소 없음
        'Historical Data Migration'  -- 마이그레이션된 데이터임을 표시
      );
    END LOOP;
    
    -- 진행 상황 출력 (100개마다)
    IF event_record.id % 100 = 0 THEN
      RAISE NOTICE 'Processed event_id: %, view_count: %', event_record.id, event_record.view_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- 마이그레이션 결과 확인
SELECT 
  DATE(viewed_at) as view_date,
  COUNT(*) as total_views,
  COUNT(DISTINCT event_id) as unique_events
FROM event_views_log
WHERE user_agent = 'Historical Data Migration'
GROUP BY DATE(viewed_at)
ORDER BY view_date DESC;

-- 전체 통계 확인
SELECT 
  'Total events with views' as metric,
  COUNT(DISTINCT id) as count
FROM events
WHERE view_count > 0
UNION ALL
SELECT 
  'Total view logs created' as metric,
  COUNT(*) as count
FROM event_views_log
WHERE user_agent = 'Historical Data Migration'
UNION ALL
SELECT 
  'Total view count in events table' as metric,
  SUM(view_count)::BIGINT as count
FROM events;
