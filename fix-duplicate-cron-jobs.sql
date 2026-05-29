-- ============================================
-- 중복 Cron Job 삭제 및 정리
-- ============================================
-- 문제: 오래된 cron job들이 존재하지 않는 함수를 호출하고 있음
-- 해결: 오래된 job 삭제하고 올바른 job만 유지

-- 1. 오래된 cron job 삭제 (안전하게)
DO $$
BEGIN
  -- Job 1: update-visitor-stats-today 삭제
  BEGIN
    PERFORM cron.unschedule('update-visitor-stats-today');
    RAISE NOTICE '✅ Job 1 (update-visitor-stats-today) 삭제 완료';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Job 1 not found, skipping';
  END;
  
  -- Job 2: update-visitor-stats-full 삭제
  BEGIN
    PERFORM cron.unschedule('update-visitor-stats-full');
    RAISE NOTICE '✅ Job 2 (update-visitor-stats-full) 삭제 완료';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Job 2 not found, skipping';
  END;
END $$;


-- 2. 현재 남아있는 cron job 확인
SELECT 
  '=== 정리 후 Cron Job 목록 ===' as info,
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%visitor%'
ORDER BY jobid;


-- 3. 캐시 강제 업데이트 (즉시 실행)
SELECT update_visitor_smart_cache();


-- 4. 캐시 상태 확인
SELECT 
  '=== 스마트 캐시 상태 ===' as info,
  cache_type,
  visit_count,
  last_updated,
  NOW() - last_updated AS age
FROM visitor_stats_smart_cache
ORDER BY cache_type;


-- 5. 실제 데이터 확인
SELECT 
  '=== visitor_stats 실제 데이터 ===' as info,
  visit_date,
  SUM(visit_count) as total_count
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;


-- ============================================
-- 완료!
-- ============================================
-- 이제 다음 2개의 cron job만 남아있어야 합니다:
-- 1. update-today-visitor-stats (30분마다)
-- 2. update-daily-visitor-stats (새벽 4시 10분)
-- 
-- 오래된 job들이 삭제되어 더 이상 오류가 발생하지 않습니다.
