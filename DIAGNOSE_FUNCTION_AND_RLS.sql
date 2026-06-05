-- ============================================
-- 방문자 통계 0명 문제 진단
-- ============================================
-- 상황: RPC 함수는 존재하지만 데이터가 들어오지 않음
-- 확인 사항:
-- 1. 함수 구현 내용 확인
-- 2. 함수 권한 확인
-- 3. RLS 정책 확인
-- 4. 수동 테스트
-- ============================================

-- ============================================
-- 1단계: 함수 구현 내용 확인
-- ============================================
SELECT 
  '=== 1단계: 함수 구현 확인 ===' as section,
  '' as detail
UNION ALL
SELECT 
  '함수명',
  proname::text
FROM pg_proc
WHERE proname = 'increment_visitor_stat'
UNION ALL
SELECT 
  'SECURITY 모드',
  CASE prosecdef 
    WHEN true THEN '✅ SECURITY DEFINER (RLS 우회)'
    ELSE '⚠️ SECURITY INVOKER (RLS 영향받음)'
  END::text
FROM pg_proc
WHERE proname = 'increment_visitor_stat';

-- 함수 소스코드 확인
SELECT 
  '',
  '함수 소스코드:'
UNION ALL
SELECT 
  '',
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'increment_visitor_stat';

-- ============================================
-- 2단계: 함수 실행 권한 확인
-- ============================================
SELECT 
  '',
  '=== 2단계: 함수 권한 확인 ==='
UNION ALL
SELECT 
  '권한 부여 대상',
  grantee::text
FROM information_schema.routine_privileges
WHERE routine_name = 'increment_visitor_stat';

-- ============================================
-- 3단계: visitor_stats 테이블 RLS 정책 확인
-- ============================================
SELECT 
  '',
  '=== 3단계: RLS 정책 확인 ==='
UNION ALL
SELECT 
  '테이블',
  tablename::text || ' - RLS ' || 
  CASE relrowsecurity 
    WHEN true THEN '활성화 ✅'
    ELSE '비활성화'
  END
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'visitor_stats'
UNION ALL
SELECT 
  '정책 목록',
  '아래 참조';

-- RLS 정책 상세
SELECT 
  '  - ' || polname as "정책명",
  '역할: ' || 
  CASE 
    WHEN polroles::text = '{0}' THEN 'public (모든 사용자)'
    ELSE (SELECT string_agg(rolname, ', ') FROM pg_roles WHERE oid = ANY(polroles))
  END ||
  ', 명령: ' || polcmd::text
FROM pg_policy
WHERE polrelid = 'visitor_stats'::regclass;

-- ============================================
-- 4단계: 현재 visitor_stats 데이터 확인
-- ============================================
SELECT 
  '',
  '=== 4단계: 현재 데이터 상태 ==='
UNION ALL
SELECT 
  '총 레코드 수',
  COUNT(*)::text
FROM visitor_stats
UNION ALL
SELECT 
  '오늘 날짜',
  CURRENT_DATE::text
UNION ALL
SELECT 
  '오늘 방문 수',
  COALESCE(SUM(visit_count), 0)::text
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
UNION ALL
SELECT 
  '어제 방문 수',
  COALESCE(SUM(visit_count), 0)::text
FROM visitor_stats
WHERE visit_date = CURRENT_DATE - 1;

-- 최근 5개 레코드
SELECT 
  '',
  '최근 5개 레코드:'
UNION ALL
SELECT 
  '  ' || visit_date::text || ' ' || visit_hour::text || '시',
  visit_count::text || '명'
FROM visitor_stats
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 5;

-- ============================================
-- 5단계: 수동 테스트 (직접 INSERT 시도)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== 5단계: 수동 테스트 ===';
  RAISE NOTICE '테스트 1: increment_visitor_stat() 함수 호출 시도...';
  
  BEGIN
    PERFORM increment_visitor_stat(CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER);
    RAISE NOTICE '✅ 함수 호출 성공';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 함수 호출 실패: %', SQLERRM;
  END;
  
  RAISE NOTICE '테스트 2: 직접 INSERT 시도...';
  BEGIN
    INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
    VALUES (CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER, 9999)
    ON CONFLICT (visit_date, visit_hour)
    DO UPDATE SET visit_count = visitor_stats.visit_count + 9999;
    RAISE NOTICE '✅ 직접 INSERT 성공';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 직접 INSERT 실패: %', SQLERRM;
  END;
END $$;

-- ============================================
-- 6단계: 테스트 후 결과 확인
-- ============================================
SELECT 
  '',
  '=== 6단계: 테스트 결과 확인 ==='
UNION ALL
SELECT 
  '오늘 현재 시간대',
  CURRENT_DATE::text || ' ' || EXTRACT(HOUR FROM NOW())::text || '시'
UNION ALL
SELECT 
  '해당 시간대 방문 수',
  COALESCE(visit_count::text, '0')
FROM visitor_stats
WHERE visit_date = CURRENT_DATE 
  AND visit_hour = EXTRACT(HOUR FROM NOW())::INTEGER;

-- ============================================
-- 진단 결과 해석:
-- ============================================
-- ✅ 함수가 SECURITY DEFINER이고 권한이 있으면 → RLS 문제 아님
-- ❌ 함수 호출 실패하면 → 함수 자체에 오류 있음
-- ❌ 직접 INSERT 실패하면 → RLS 정책 문제
-- ✅ 둘 다 성공하면 → 프론트엔드 호출 문제
-- ============================================
