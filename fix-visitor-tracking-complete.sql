-- ============================================
-- 방문자 통계 수집 완전 수정 스크립트
-- ============================================
-- 문제: visitor_stats 테이블에 데이터가 전혀 수집되지 않음
-- 원인: RPC 함수 누락 또는 RLS 정책 문제
-- 해결: RPC 함수 생성 + RLS 정책 수정 + 테스트
-- ============================================

-- 1단계: RPC 함수 생성 (increment_visitor_stat)
-- 프론트엔드에서 호출하는 함수
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- 관리자 권한으로 실행 (RLS 우회)
AS $$
BEGIN
  -- UPSERT: 같은 날짜+시간이 있으면 +1, 없으면 새로 생성
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (p_visit_date, p_visit_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
END;
$$;

-- 2단계: RLS 정책 확인 및 수정
-- 익명 사용자도 RPC 함수를 호출할 수 있어야 함

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can insert visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can update visitor stats" ON visitor_stats;

-- 새 정책 생성
-- 읽기: 모두 허용
CREATE POLICY "Anyone can read visitor stats"
ON visitor_stats
FOR SELECT
TO public
USING (true);

-- 쓰기: 서비스 역할만 허용 (RPC 함수가 SECURITY DEFINER로 실행되므로 OK)
CREATE POLICY "Service role can insert visitor stats"
ON visitor_stats
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update visitor stats"
ON visitor_stats
FOR UPDATE
TO service_role
USING (true);

-- 3단계: RPC 함수 실행 권한 부여
-- 익명 사용자(anon)와 인증된 사용자(authenticated) 모두 함수 실행 가능
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;

-- 4단계: 테스트 - 오늘 날짜로 방문 기록 추가
DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
  -- 테스트 데이터 삽입
  PERFORM increment_visitor_stat(v_today, v_hour);
  
  RAISE NOTICE '✅ 테스트 성공: 오늘 %시 방문 기록 추가됨', v_hour;
END $$;

-- 5단계: 결과 확인
SELECT 
  '✅ 설정 완료' as status,
  '오늘 방문 기록' as description,
  visit_date,
  visit_hour,
  visit_count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour DESC
LIMIT 5;

-- 6단계: 캐시 강제 업데이트 (Edge Function 호출 대신 직접 업데이트)
DO $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_7days_ago DATE := CURRENT_DATE - INTERVAL '7 days';
  v_30days_ago DATE := CURRENT_DATE - INTERVAL '30 days';
  v_365days_ago DATE := CURRENT_DATE - INTERVAL '365 days';
  
  v_today_count INTEGER;
  v_yesterday_count INTEGER;
  v_7days_count INTEGER;
  v_30days_count INTEGER;
  v_365days_count INTEGER;
  v_total_count INTEGER;
  v_first_date DATE;
BEGIN
  -- 각 기간별 집계
  SELECT COALESCE(SUM(visit_count), 0) INTO v_today_count
  FROM visitor_stats WHERE visit_date = v_today;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_yesterday_count
  FROM visitor_stats WHERE visit_date = v_yesterday;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_7days_count
  FROM visitor_stats WHERE visit_date >= v_7days_ago;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_30days_count
  FROM visitor_stats WHERE visit_date >= v_30days_ago;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_365days_count
  FROM visitor_stats WHERE visit_date >= v_365days_ago;
  
  SELECT COALESCE(SUM(visit_count), 0) INTO v_total_count
  FROM visitor_stats;
  
  SELECT MIN(visit_date) INTO v_first_date
  FROM visitor_stats;
  
  -- 캐시 업데이트
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
  ) VALUES (
    'summary',
    v_today_count,
    v_yesterday_count,
    v_7days_count,
    v_30days_count,
    v_365days_count,
    v_total_count,
    v_first_date,
    NOW()
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    today = v_today_count,
    yesterday = v_yesterday_count,
    last_7_days = v_7days_count,
    last_30_days = v_30days_count,
    last_365_days = v_365days_count,
    total_visits = v_total_count,
    first_visit_date = v_first_date,
    updated_at = NOW();
  
  RAISE NOTICE '✅ 캐시 업데이트 완료';
  RAISE NOTICE '   오늘: %명', v_today_count;
  RAISE NOTICE '   어제: %명', v_yesterday_count;
  RAISE NOTICE '   최근7일: %명', v_7days_count;
  RAISE NOTICE '   최근30일: %명', v_30days_count;
END $$;

-- 7단계: 최종 확인 쿼리
SELECT 
  '=== 최종 상태 ===' as section,
  '' as detail
UNION ALL
SELECT 
  '✅ RPC 함수',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'increment_visitor_stat'
    ) THEN '생성됨'
    ELSE '❌ 없음'
  END
UNION ALL
SELECT 
  '✅ visitor_stats 데이터',
  COALESCE(COUNT(*)::TEXT, '0') || '개 레코드'
FROM visitor_stats
UNION ALL
SELECT 
  '✅ 캐시 상태',
  '오늘: ' || COALESCE(today::TEXT, '0') || '명, 어제: ' || COALESCE(yesterday::TEXT, '0') || '명'
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ============================================
-- 사용 방법:
-- 1. 이 스크립트를 Supabase SQL Editor에 복사
-- 2. 전체 선택 후 실행 (Run)
-- 3. 결과 확인:
--    - "✅ 설정 완료" 메시지 확인
--    - "✅ 테스트 성공" 메시지 확인
--    - 최종 상태에서 모든 항목이 ✅인지 확인
-- 4. 프론트엔드에서 페이지 새로고침 후 방문자 통계 확인
-- ============================================
