-- ============================================
-- 방문자 통계 시간대 문제 해결
-- ============================================
-- 문제: visit_hour가 UTC로 저장되어 한국 시간과 9시간 차이 발생
-- 해결: KST 기준으로 저장하도록 함수 수정
-- ============================================

-- 1️⃣ increment_visitor_stat 함수 수정 (KST 기준)
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- UPSERT: 같은 날짜+시간이 있으면 +1, 없으면 새로 생성
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count, created_at, updated_at)
  VALUES (p_visit_date, p_visit_hour, 1, NOW(), NOW())
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
    
  RAISE LOG 'Visit recorded (KST): date=%, hour=%, count=%', 
    p_visit_date, p_visit_hour, 
    (SELECT visit_count FROM visitor_stats WHERE visit_date = p_visit_date AND visit_hour = p_visit_hour);
END;
$$;

-- 2️⃣ 권한 설정
GRANT EXECUTE ON FUNCTION increment_visitor_stat TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat TO authenticated;

-- ============================================
-- 검증
-- ============================================

-- 현재 시간 확인
SELECT 
  '=== 현재 시간 확인 ===' as info,
  NOW() as "UTC 시간",
  NOW() AT TIME ZONE 'Asia/Seoul' as "KST 시간",
  EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Seoul') as "KST 시(hour)";

-- 오늘 기록 확인
SELECT 
  '=== 오늘 방문 기록 ===' as info,
  visit_date as "날짜",
  visit_hour as "시간",
  visit_count as "방문수",
  created_at AT TIME ZONE 'Asia/Seoul' as "기록시각(KST)"
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;
