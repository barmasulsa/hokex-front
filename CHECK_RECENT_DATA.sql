-- ============================================
-- 1단계: 최근 데이터 확인
-- ============================================
SELECT 
    visit_date,
    visit_hour,
    visit_count,
    created_at
FROM visitor_stats 
WHERE visit_date >= CURRENT_DATE - 1
ORDER BY visit_date DESC, visit_hour DESC;

-- ============================================
-- 2단계: RLS 정책 확인
-- ============================================
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
