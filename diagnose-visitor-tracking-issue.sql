-- 방문자 통계 문제 진단 쿼리
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- 1. RPC 함수 존재 확인
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'increment_visitor_stat';

-- 2. RPC 함수 권한 확인
SELECT 
    proname AS function_name,
    proacl AS permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'increment_visitor_stat';

-- 3. visitor_stats 테이블 데이터 확인
SELECT 
    visit_date,
    visit_hour,
    visit_count,
    created_at,
    updated_at
FROM visitor_stats
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 10;

-- 4. 오늘 데이터 확인
SELECT 
    visit_date,
    visit_hour,
    visit_count,
    updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 5. 오늘 총 방문자 수
SELECT 
    COALESCE(SUM(visit_count), 0) as total_today
FROM visitor_stats
WHERE visit_date = CURRENT_DATE;

-- 6. visitor_stats_cache 확인
SELECT 
    cache_key,
    today,
    yesterday,
    last_7_days,
    last_30_days,
    total_visits,
    updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 6. RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'visitor_stats';
