-- ============================================
-- 방문자 통계 캐시 완전 설정 SQL (수정됨)
-- ============================================
-- 이 파일은 방문자 통계 캐시 시스템을 완전히 설정합니다.
-- 홈페이지와 관리자 페이지의 데이터 동기화 문제를 해결합니다.

-- 1. 현재 상태 확인
SELECT 
  'visitor_stats' as table_name,
  business_date,
  visitor_count
FROM visitor_stats
WHERE business_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY business_date DESC;

SELECT 
  'visitor_stats_cache' as table_name,
  business_date,
  visitor_count,
  last_updated
FROM visitor_stats_cache
WHERE business_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY business_date DESC;

-- 2. 캐시 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_visitor_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- visitor_stats 테이블의 데이터를 visitor_stats_cache로 동기화
  INSERT INTO visitor_stats_cache (business_date, visitor_count, last_updated)
  SELECT 
    business_date,
    visitor_count,
    NOW()
  FROM visitor_stats
  ON CONFLICT (business_date)
  DO UPDATE SET
    visitor_count = EXCLUDED.visitor_count,
    last_updated = NOW();
END;
$$;

-- 3. 자동 트리거 설정 (visitor_stats 변경 시 자동 캐시 업데이트)
CREATE OR REPLACE FUNCTION trigger_update_visitor_stats_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 캐시 테이블 업데이트
  INSERT INTO visitor_stats_cache (business_date, visitor_count, last_updated)
  VALUES (NEW.business_date, NEW.visitor_count, NOW())
  ON CONFLICT (business_date)
  DO UPDATE SET
    visitor_count = EXCLUDED.visitor_count,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS auto_update_visitor_stats_cache ON visitor_stats;

CREATE TRIGGER auto_update_visitor_stats_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH ROW
EXECUTE FUNCTION trigger_update_visitor_stats_cache();

-- 4. 즉시 동기화 실행
SELECT update_visitor_stats_cache();

-- 5. 자동 스케줄링 설정 (5분마다 실행)
-- 기존 cron job이 있으면 삭제 (에러 무시)
DO $$
BEGIN
  PERFORM cron.unschedule('update-visitor-stats-cache');
EXCEPTION
  WHEN OTHERS THEN
    -- job이 없으면 에러 무시
    NULL;
END $$;

-- 새 cron job 생성
SELECT cron.schedule(
  'update-visitor-stats-cache',
  '*/5 * * * *',  -- 5분마다
  $$SELECT update_visitor_stats_cache();$$
);

-- 6. 최종 검증
SELECT 
  'Verification' as status,
  COUNT(*) as cache_rows,
  MAX(last_updated) as last_cache_update
FROM visitor_stats_cache;

SELECT 
  'Comparison' as status,
  vs.business_date,
  vs.visitor_count as stats_count,
  vsc.visitor_count as cache_count,
  CASE 
    WHEN vs.visitor_count = vsc.visitor_count THEN '✓ 동기화됨'
    ELSE '✗ 불일치'
  END as sync_status
FROM visitor_stats vs
LEFT JOIN visitor_stats_cache vsc ON vs.business_date = vsc.business_date
WHERE vs.business_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY vs.business_date DESC;

-- ============================================
-- 설정 완료!
-- ============================================
-- 이제 다음과 같이 작동합니다:
-- 1. visitor_stats 테이블이 변경되면 자동으로 캐시 업데이트
-- 2. 5분마다 자동으로 전체 동기화
-- 3. 홈페이지는 visitor_stats_cache 읽음 (빠름)
-- 4. 관리자 페이지는 visitor_stats 읽음 (상세)
-- 5. 두 페이지 모두 항상 동일한 값 표시
-- ============================================
