-- ============================================
-- 방문자 통계 마이그레이션 - STEP 4, 5, 6
-- ============================================
-- 
-- 전제조건:
-- 1. delete-backup-and-continue.sql 실행 완료 (STEP 2)
-- 2. setup-visitor-counter.sql 실행 완료 (STEP 3)
--
-- ============================================

-- ============================================
-- STEP 4: Edge Function 생성 확인
-- ============================================
-- 
-- ⚠️  이 단계는 SQL이 아닌 터미널에서 수행합니다:
-- 
-- 1. Edge Function 파일 확인:
--    - supabase/functions/track-visit/index.ts 존재 확인
-- 
-- 2. Edge Function 배포:
--    cd hokex-front
--    supabase functions deploy track-visit
-- 
-- 3. Edge Function 테스트:
--    supabase functions invoke track-visit --body '{"domain":"hokex.xyz"}'
-- 
-- ============================================

SELECT '✅ STEP 4 안내: Edge Function은 터미널에서 배포해야 합니다' AS info;
SELECT '   명령어: cd hokex-front && supabase functions deploy track-visit' AS command;

-- ============================================
-- STEP 5: 프론트엔드 코드 수정 확인
-- ============================================
-- 
-- ⚠️  이 단계는 코드 수정이 필요합니다:
-- 
-- 1. src/services/visitorService.ts 파일 생성/수정
--    - trackVisit() 함수 추가
--    - getVisitorStats() 함수 추가
-- 
-- 2. 기존 호출 부분 교체:
--    - recordDetailedVisit() → trackVisit()
--    - getCachedVisitorStats() → getVisitorStats()
-- 
-- 3. 빌드 및 배포:
--    npm run build
--    git add -A
--    git commit -m "feat: 방문자 통계 시스템 마이그레이션 완료"
--    git push
-- 
-- ============================================

SELECT '✅ STEP 5 안내: 프론트엔드 코드를 수정해야 합니다' AS info;
SELECT '   파일: src/services/visitorService.ts' AS file;

-- ============================================
-- STEP 6: 정리 작업 (Cron Jobs 설정)
-- ============================================

-- 6-1. 만료된 Dedup 레코드 정리 (1시간마다)
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 * * * *',  -- 매 시간 정각
  $$SELECT clean_expired_dedup_records();$$
);

SELECT '✅ Cron 작업 생성: cleanup-visitor-dedup (1시간마다 만료된 레코드 삭제)' AS status;

-- 6-2. 매일 자정 today_count 리셋 (KST 00:00 = UTC 15:00)
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',  -- UTC 15:00 = KST 00:00 (다음날)
  $$SELECT reset_daily_visitor_counts();$$
);

SELECT '✅ Cron 작업 생성: reset-daily-visitor-counts (매일 자정 KST 카운터 리셋)' AS status;

-- ============================================
-- STEP 6 검증: Cron Job 확인
-- ============================================

-- 등록된 Cron Job 목록 확인
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname IN ('cleanup-visitor-dedup', 'reset-daily-visitor-counts')
ORDER BY jobname;

SELECT '✅ STEP 6 완료: Cron 작업이 등록되었습니다' AS status;

-- ============================================
-- 전체 시스템 검증
-- ============================================

-- 1. 테이블 존재 확인
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('visitor_sites', 'visitor_logs', 'visitor_dedup')
ORDER BY table_name;

-- 2. 함수 존재 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('clean_expired_dedup_records', 'reset_daily_visitor_counts')
ORDER BY routine_name;

-- 3. Cron Job 확인
SELECT 
  jobname,
  active,
  schedule
FROM cron.job
WHERE jobname LIKE '%visitor%'
ORDER BY jobname;

-- 4. visitor_sites 데이터 확인
SELECT 
  domain,
  total_count,
  today_count,
  last_visit_date,
  created_at,
  updated_at
FROM visitor_sites
ORDER BY domain;

-- ============================================
-- 최종 완료 메시지
-- ============================================

SELECT '✅✅✅ 마이그레이션 STEP 4, 5, 6 SQL 부분 완료!' AS final_status;
SELECT '' AS blank_line;
SELECT '📋 다음 수동 작업 필요:' AS manual_tasks;
SELECT '1️⃣  Edge Function 배포: supabase functions deploy track-visit' AS task_1;
SELECT '2️⃣  프론트엔드 코드 수정: src/services/visitorService.ts' AS task_2;
SELECT '3️⃣  테스트: 실제 방문하여 카운터 증가 확인' AS task_3;
SELECT '4️⃣  모니터링: 24시간 동안 통계 정확성 확인' AS task_4;
