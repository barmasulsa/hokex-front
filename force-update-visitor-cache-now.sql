-- 방문객 통계 캐시를 실제 DB 데이터로 즉시 업데이트

-- 1단계: 현재 실제 데이터 확인 (KST 기준)
DO $$
DECLARE
  v_today DATE;
  v_yesterday DATE;
  v_today_count INTEGER := 0;
  v_yesterday_count INTEGER := 0;
  v_last_7_days INTEGER := 0;
  v_last_30_days INTEGER := 0;
  v_last_365_days INTEGER := 0;
  v_total_visits INTEGER := 0;
  v_first_visit_date DATE;
BEGIN
  -- KST 기준 날짜 계산
  v_today := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE;
  v_yesterday := v_today - INTERVAL '1 day';
  
  RAISE NOTICE '=== 현재 시각 (KST): % ===', NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul';
  RAISE NOTICE '오늘 날짜 (KST): %', v_today;
  RAISE NOTICE '어제 날짜 (KST): %', v_yesterday;
  RAISE NOTICE '';
  
  -- 오늘 방문자 수
  SELECT COALESCE(SUM(visit_count), 0) INTO v_today_count
  FROM visitor_stats
  WHERE visit_date = v_today;
  
  RAISE NOTICE '✓ 오늘 (%) 방문자: %명', v_today, v_today_count;
  
  -- 어제 방문자 수
  SELECT COALESCE(SUM(visit_count), 0) INTO v_yesterday_count
  FROM visitor_stats
  WHERE visit_date = v_yesterday;
  
  RAISE NOTICE '✓ 어제 (%) 방문자: %명', v_yesterday, v_yesterday_count;
  
  -- 최근 7일
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_7_days
  FROM visitor_stats
  WHERE visit_date >= v_today - INTERVAL '7 days'
    AND visit_date <= v_today;
  
  RAISE NOTICE '✓ 최근 7일 방문자: %명', v_last_7_days;
  
  -- 최근 30일
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_30_days
  FROM visitor_stats
  WHERE visit_date >= v_today - INTERVAL '30 days'
    AND visit_date <= v_today;
  
  RAISE NOTICE '✓ 최근 30일 방문자: %명', v_last_30_days;
  
  -- 최근 1년
  SELECT COALESCE(SUM(visit_count), 0) INTO v_last_365_days
  FROM visitor_stats
  WHERE visit_date >= v_today - INTERVAL '365 days'
    AND visit_date <= v_today;
  
  RAISE NOTICE '✓ 최근 1년 방문자: %명', v_last_365_days;
  
  -- 총 방문 수
  SELECT COALESCE(SUM(visit_count), 0) INTO v_total_visits
  FROM visitor_stats;
  
  RAISE NOTICE '✓ 총 방문 수: %명', v_total_visits;
  
  -- 첫 방문 날짜
  SELECT MIN(visit_date) INTO v_first_visit_date
  FROM visitor_stats;
  
  RAISE NOTICE '✓ 첫 방문 날짜: %', v_first_visit_date;
  RAISE NOTICE '';
  
  -- 2단계: 캐시 테이블 업데이트
  RAISE NOTICE '=== 캐시 업데이트 중... ===';
  
  INSERT INTO visitor_stats_cache (
    cache_key,
    today,
    yesterday,
    last_7_days,
    last_30_days,
    last_365_days,
    total_visits,
    first_visit_date,
    updated_at
  )
  VALUES (
    'summary',
    v_today_count,
    v_yesterday_count,
    v_last_7_days,
    v_last_30_days,
    v_last_365_days,
    v_total_visits,
    v_first_visit_date,
    NOW()
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    today = v_today_count,
    yesterday = v_yesterday_count,
    last_7_days = v_last_7_days,
    last_30_days = v_last_30_days,
    last_365_days = v_last_365_days,
    total_visits = v_total_visits,
    first_visit_date = v_first_visit_date,
    updated_at = NOW();
  
  RAISE NOTICE '✅ 캐시 업데이트 완료!';
  RAISE NOTICE '';
END $$;

-- 3단계: 업데이트된 캐시 확인
SELECT 
  '=== 업데이트된 캐시 ===' as status,
  cache_key,
  today as "오늘",
  yesterday as "어제",
  last_7_days as "최근7일",
  last_30_days as "최근30일",
  last_365_days as "최근1년",
  total_visits as "총방문",
  first_visit_date as "첫방문일",
  updated_at as "업데이트시각",
  NOW() - updated_at as "캐시나이"
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 4단계: 최근 7일 상세 데이터 확인
SELECT 
  '=== 최근 7일 일별 통계 ===' as status,
  visit_date as "날짜",
  SUM(visit_count) as "방문자수",
  COUNT(*) as "시간대수"
FROM visitor_stats
WHERE visit_date >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
