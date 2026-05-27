-- 방문자 통계 UPSERT 함수 생성
-- 시크릿 모드에서 중복 생성 방지

-- 1. 기존 함수 삭제 (있다면)
DROP FUNCTION IF EXISTS increment_visitor_stat(DATE, INTEGER);

-- 2. UPSERT 함수 생성
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- INSERT 시도, 충돌 시 count 증가
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (p_visit_date, p_visit_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET visit_count = visitor_stats.visit_count + 1;
END;
$$;

-- 3. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;

-- 4. 테스트
SELECT increment_visitor_stat(CURRENT_DATE, EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::INTEGER);

-- 5. 결과 확인
SELECT * FROM visitor_stats 
WHERE visit_date = CURRENT_DATE 
ORDER BY visit_hour DESC 
LIMIT 5;
