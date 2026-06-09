-- 방문자 추적 시스템 전체 상태 확인
-- 실행 후 결과를 확인하세요

-- 1. visitor_sites 테이블 확인 (사이트별 집계)
SELECT 
  '1. visitor_sites 상태' as check_name,
  domain,
  total_count,
  today_count,
  last_visit_date,
  created_at,
  updated_at
FROM visitor_sites
WHERE domain = 'hokex.xyz';

-- 2. visitor_dedup 테이블 확인 (중복 방지 - 현재 활성)
SELECT 
  '2. visitor_dedup 활성 레코드' as check_name,
  COUNT(*) as active_dedups,
  MIN(last_visit) as first_visit,
  MAX(last_visit) as last_visit,
  MIN(ttl_expiry) as earliest_expiry,
  MAX(ttl_expiry) as latest_expiry
FROM visitor_dedup vd
JOIN visitor_sites vs ON vd.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vd.ttl_expiry > NOW();

-- 3. visitor_logs 테이블 확인 (전체 방문 로그)
SELECT 
  '3. visitor_logs 상태' as check_name,
  COUNT(*) as total_logs,
  MIN(vl.created_at) as first_log,
  MAX(vl.created_at) as last_log
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz';

-- 4. 최근 10개 방문 로그 상세
SELECT 
  '4. 최근 방문 로그 (최대 10개)' as check_name,
  vl.created_at,
  vl.timezone,
  LEFT(vl.visitor_ip, 10) || '...' as ip_preview,
  LEFT(vl.user_agent, 50) || '...' as agent_preview
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
ORDER BY vl.created_at DESC
LIMIT 10;

-- 5. get_visitor_statistics 함수 테스트
SELECT 
  '5. get_visitor_statistics 함수 결과' as check_name,
  get_visitor_statistics('hokex.xyz') as function_result;

-- 6. 테이블 존재 여부 확인
SELECT 
  '6. 테이블 존재 확인' as check_name,
  table_name,
  CASE 
    WHEN table_name = 'visitor_sites' THEN '✓ 사이트별 집계'
    WHEN table_name = 'visitor_dedup' THEN '✓ 중복 방지 (20분 TTL)'
    WHEN table_name = 'visitor_logs' THEN '✓ 전체 방문 로그'
  END as description
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('visitor_sites', 'visitor_dedup', 'visitor_logs')
ORDER BY table_name;

-- 7. Edge Function 호출 가능 여부 (RLS 정책 확인)
SELECT 
  '7. RLS 정책 상태' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('visitor_sites', 'visitor_dedup', 'visitor_logs')
ORDER BY tablename, policyname;

-- ==========================================
-- 결과 해석:
-- ==========================================
-- 
-- 1. visitor_sites 상태:
--    - 0개 레코드 = Edge Function이 아직 실행되지 않음
--    - 1개 레코드 + total_count/today_count = 0 = 테이블만 생성됨
--    - 1개 레코드 + total_count > 0 = 정상 작동 중!
--
-- 2. visitor_dedup 활성 레코드:
--    - 0개 = 최근 20분 내 방문 없음
--    - 1개 이상 = 최근 방문자 있음 (정상)
--
-- 3. visitor_logs 상태:
--    - 0개 = 방문 로그 없음
--    - 1개 이상 = 방문 기록됨 (정상)
--
-- 4. 최근 방문 로그:
--    - IP, User-Agent 확인 가능
--
-- 5. get_visitor_statistics 함수:
--    - JSON 반환되면 정상
--    - 모든 값이 0이면 데이터가 아직 없는 것
--
-- 6. 테이블 존재 확인:
--    - 3개 모두 있어야 정상
--
-- 7. RLS 정책:
--    - service_role 또는 anon에 대한 정책 확인
--    - Edge Function은 service_role로 실행됨
--
-- ==========================================
-- 다음 단계:
-- ==========================================
--
-- 만약 모든 테이블이 비어있다면:
--   → Edge Function이 배포되지 않았거나
--   → 프론트엔드에서 호출되지 않고 있음
--   → 브라우저 개발자 도구 Network 탭에서 track-visit 호출 확인
--
-- 만약 visitor_logs에 데이터가 있다면:
--   → 시스템이 정상 작동 중!
--   → 관리자 페이지에서 통계 확인 가능
--
