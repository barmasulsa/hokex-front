-- 1. event_views_log 테이블에 데이터가 있는지 확인
SELECT COUNT(*) as total_logs FROM event_views_log;

-- 2. 어제 날짜의 로그 확인
SELECT COUNT(*) as yesterday_logs 
FROM event_views_log 
WHERE DATE(viewed_at) = CURRENT_DATE - INTERVAL '1 day';

-- 3. 상위 10개 행사의 조회수 (어제 기준)
SELECT 
  e.title,
  COUNT(evl.id) as view_count
FROM events e
LEFT JOIN event_views_log evl ON e.id = evl.event_id
  AND DATE(evl.viewed_at) = CURRENT_DATE - INTERVAL '1 day'
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title
HAVING COUNT(evl.id) > 0
ORDER BY view_count DESC
LIMIT 10;

-- 4. get_event_views_by_period 함수가 존재하는지 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_event_views_by_period';

-- 5. 함수 테스트 (어제 데이터)
SELECT * FROM get_event_views_by_period(
  (CURRENT_DATE - INTERVAL '1 day')::DATE,
  (CURRENT_DATE - INTERVAL '1 day')::DATE,
  10,
  NULL,
  NULL
);

-- 6. 함수 테스트 (최근 7일)
SELECT * FROM get_event_views_by_period(
  (CURRENT_DATE - INTERVAL '7 days')::DATE,
  CURRENT_DATE,
  10,
  NULL,
  NULL
);
