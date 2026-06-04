-- ============================================
-- 🚨 긴급 수정: 방문자 통계 즉시 복구
-- ============================================
-- 실행 방법:
-- 1. 이 파일 전체를 복사
-- 2. Supabase SQL Editor에 붙여넣기
-- 3. Run 버튼 클릭
-- 4. 5분 후 홈페이지에서 통계 확인
-- ============================================

-- 1️⃣ RPC 함수 생성 (없으면 생성, 있으면 덮어쓰기)
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- ⭐ 핵심: 관리자 권한으로 실행하여 RLS 우회
SET search_path = public
AS $$
BEGIN
  -- UPSERT: 같은 날짜+시간이 있으면 +1, 없으면 새로 생성
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count, created_at, updated_at)
  VALUES (p_visit_date, p_visit_hour, 1, NOW(), NOW())
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
    
  RAISE LOG 'Visit recorded: date=%, hour=%, new_count=%', 
    p_visit_date, p_visit_hour, 
    (SELECT visit_count FROM visitor_stats WHERE visit_date = p_visit_date AND visit_hour = p_visit_hour);
END;
$$;

-- 2️⃣ 함수 실행 권한 부여 (익명 사용자 포함)
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO service_role;

-- 3️⃣ RLS 정책 재설정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can read visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can insert visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can update visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Allow service role all" ON visitor_stats;

-- 새 정책 생성
-- 읽기: 모두 허용
CREATE POLICY "allow_read_visitor_stats"
ON visitor_stats
FOR SELECT
TO public
USING (true);

-- 쓰기: 서비스 역할만 허용 (RPC 함수가 SECURITY DEFINER이므로 이것으로 충분)
CREATE POLICY "allow_service_role_insert"
ON visitor_stats
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "allow_service_role_update"
ON visitor_stats
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 4️⃣ 테스트: 지금 즉시 방문 기록 추가
DO $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_hour INTEGER := EXTRACT(HOUR FROM NOW())::INTEGER;
  v_count INTEGER;
BEGIN
  -- 현재 시간으로 방문 기록
  PERFORM increment_visitor_stat(v_date, v_hour);
  
  -- 결과 확인
  SELECT visit_count INTO v_count
  FROM visitor_stats
  WHERE visit_date = v_date AND visit_hour = v_hour;
  
  RAISE NOTICE '✅ 테스트 성공!';
  RAISE NOTICE '   날짜: %', v_date;
  RAISE NOTICE '   시간: %시', v_hour;
  RAISE NOTICE '   방문 수: %명', v_count;
END $$;

-- 5️⃣ 캐시 강제 업데이트 (visitor_stats_cache 테이블)
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
  
  -- 캐시 테이블이 없으면 생성
  CREATE TABLE IF NOT EXISTS visitor_stats_cache (
    cache_key TEXT PRIMARY KEY,
    today INTEGER DEFAULT 0,
    yesterday INTEGER DEFAULT 0,
    last_7_days INTEGER DEFAULT 0,
    last_30_days INTEGER DEFAULT 0,
    last_365_days INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    first_visit_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
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
  RAISE NOTICE '   최근 7일: %명', v_7days_count;
  RAISE NOTICE '   최근 30일: %명', v_30days_count;
  RAISE NOTICE '   최근 1년: %명', v_365days_count;
  RAISE NOTICE '   총 방문: %명', v_total_count;
END $$;

-- 6️⃣ 최종 검증
SELECT 
  '=== 🎉 설정 완료! ===' as "━━━━━━━━━━━━━━━━━━━━━",
  '' as " "
UNION ALL
SELECT 
  '✅ RPC 함수',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_visitor_stat')
    THEN '생성됨'
    ELSE '❌ 실패'
  END
UNION ALL
SELECT 
  '✅ 실행 권한',
  CASE 
    WHEN has_function_privilege('anon', 'increment_visitor_stat(date,integer)', 'execute')
    THEN '설정됨'
    ELSE '❌ 실패'
  END
UNION ALL
SELECT 
  '✅ visitor_stats 데이터',
  COALESCE(COUNT(*)::TEXT, '0') || '개 레코드'
FROM visitor_stats
UNION ALL
SELECT 
  '✅ 오늘 데이터',
  COALESCE(SUM(visit_count)::TEXT, '0') || '명 방문'
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
UNION ALL
SELECT 
  '✅ 캐시 상태',
  '오늘: ' || COALESCE(today::TEXT, '0') || '명'
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 7️⃣ 다음 단계 안내
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━' as " ",
  '=== 📌 다음 단계 ===' as "━━━━━━━━━━━━━━━━━━━━━"
UNION ALL
SELECT 
  '1️⃣',
  '위 결과에서 모든 항목이 ✅인지 확인'
UNION ALL
SELECT 
  '2️⃣',
  '프론트엔드(hokex.site) 페이지 새로고침'
UNION ALL
SELECT 
  '3️⃣',
  '개발자 도구(F12) 콘솔에서 다음 메시지 확인:'
UNION ALL
SELECT 
  '   ',
  '"✅ DB 저장 성공!"'
UNION ALL
SELECT 
  '4️⃣',
  '5분 후 홈페이지 우측에 방문자 통계 표시 확인'
UNION ALL
SELECT 
  '5️⃣',
  '문제 지속 시: localStorage.removeItem("last_visit_date") 실행 후 새로고침';

-- ============================================
-- 🔧 트러블슈팅
-- ============================================
-- 
-- Q1: "오늘 데이터"가 여전히 0명이면?
-- A1: 브라우저 콘솔(F12)에서 에러 메시지 확인
--     localStorage.removeItem('last_visit_date')
--     페이지 새로고침
--
-- Q2: "❌ DB RPC 실패" 에러가 콘솔에 나오면?
-- A2: 이 SQL을 다시 실행하고, 특히 2️⃣ 권한 부여 부분 확인
--
-- Q3: 여러 명이 접속했는데도 0명이면?
-- A3: 각 사용자가 오늘 처음 방문해야 카운트됨
--     테스트: 다른 브라우저(Chrome, Edge, Safari) 또는
--           시크릿 모드로 접속해보기
--
-- ============================================
