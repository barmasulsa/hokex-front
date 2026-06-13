-- 홈페이지 방문자 통계 0명 문제 해결
-- 문제: VisitorStats 컴포넌트가 get_visitor_statistics() RPC를 호출하는데 0명으로 나옴

-- ========================================
-- STEP 1: RPC 함수 재생성 (SECURITY DEFINER)
-- ========================================
-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_visitor_statistics();

-- RPC 함수 재생성 (SECURITY DEFINER로 권한 상승)
CREATE OR REPLACE FUNCTION get_visitor_statistics()
RETURNS TABLE (
  period TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- 중요: 함수 소유자 권한으로 실행
SET search_path = public
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  yesterday_start TIMESTAMPTZ;
  yesterday_end TIMESTAMPTZ;
  seven_days_ago TIMESTAMPTZ;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  -- 한국 시간 기준으로 오늘 자정 계산 (UTC+9)
  today_start := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::TIMESTAMPTZ;
  
  -- 어제 자정 ~ 오늘 자정
  yesterday_start := today_start - INTERVAL '1 day';
  yesterday_end := today_start;
  
  -- 7일 전, 30일 전
  seven_days_ago := today_start - INTERVAL '7 days';
  thirty_days_ago := today_start - INTERVAL '30 days';

  RETURN QUERY
  -- 오늘 방문자
  SELECT 
    'today'::TEXT as period,
    COUNT(DISTINCT visitor_ip)::BIGINT as count
  FROM visitor_logs
  WHERE created_at >= today_start

  UNION ALL

  -- 어제 방문자
  SELECT 
    'yesterday'::TEXT as period,
    COUNT(DISTINCT visitor_ip)::BIGINT as count
  FROM visitor_logs
  WHERE created_at >= yesterday_start 
    AND created_at < yesterday_end

  UNION ALL

  -- 최근 7일 방문자
  SELECT 
    'last_7_days'::TEXT as period,
    COUNT(DISTINCT visitor_ip)::BIGINT as count
  FROM visitor_logs
  WHERE created_at >= seven_days_ago

  UNION ALL

  -- 최근 30일 방문자
  SELECT 
    'last_30_days'::TEXT as period,
    COUNT(DISTINCT visitor_ip)::BIGINT as count
  FROM visitor_logs
  WHERE created_at >= thirty_days_ago;
END;
$$;

-- ========================================
-- STEP 2: RPC 함수에 공개 실행 권한 부여
-- ========================================
-- 모든 인증된 사용자가 이 RPC 함수를 실행할 수 있도록 허용
GRANT EXECUTE ON FUNCTION get_visitor_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_visitor_statistics() TO anon;

-- ========================================
-- STEP 3: visitor_logs 테이블 RLS 정책 확인 및 수정
-- ========================================
-- 기존 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'visitor_logs';

-- RLS가 활성화되어 있는지 확인
SELECT tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'visitor_logs';

-- 만약 SELECT 정책이 없다면 추가 (RPC 함수가 SECURITY DEFINER이므로 필요 없을 수 있음)
-- 하지만 안전을 위해 추가
DO $$
BEGIN
  -- 기존 SELECT 정책이 없으면 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'visitor_logs' 
      AND cmd = 'SELECT'
  ) THEN
    -- visitor_logs는 모든 인증된 사용자가 읽을 수 있도록 설정
    CREATE POLICY "Allow authenticated users to read visitor logs"
    ON visitor_logs
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ========================================
-- STEP 4: 테스트
-- ========================================
-- RPC 함수 직접 실행 테스트
SELECT * FROM get_visitor_statistics();

-- visitor_logs 테이블에 데이터가 있는지 확인
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT visitor_ip) as unique_visitors,
  MIN(created_at) as first_visit,
  MAX(created_at) as last_visit
FROM visitor_logs;

-- ========================================
-- 완료!
-- ========================================
-- 이제 홈페이지에서 VisitorStats 컴포넌트가 정상적으로 작동해야 합니다.
-- 만약 여전히 0명으로 표시된다면:
-- 1. 브라우저 캐시를 지우고 새로고침
-- 2. 개발자 도구 콘솔에서 에러 메시지 확인
-- 3. Supabase Dashboard에서 RPC 함수 로그 확인
