-- ============================================
-- visitor_stats RLS 정책 완전 수정
-- ============================================

-- 1단계: 기존 정책 모두 삭제
DROP POLICY IF EXISTS "allow_public_read_access" ON visitor_stats;
DROP POLICY IF EXISTS "Allow public read access" ON visitor_stats;
DROP POLICY IF EXISTS "Allow service role Full access" ON visitor_stats;
DROP POLICY IF EXISTS "Authenticated users can insert visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Authenticated users can update visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "allow_read_visitor_stats" ON visitor_stats;
DROP POLICY IF EXISTS "allow_service_role_insert" ON visitor_stats;
DROP POLICY IF EXISTS "allow_service_role_update" ON visitor_stats;

-- 2단계: 간단하고 명확한 정책 생성

-- 누구나 읽기 가능 (anon, authenticated 모두)
CREATE POLICY "visitor_stats_select_public"
ON visitor_stats
FOR SELECT
TO public
USING (true);

-- 누구나 INSERT 가능 (방문자 추적용)
CREATE POLICY "visitor_stats_insert_public"
ON visitor_stats
FOR INSERT
TO public
WITH CHECK (true);

-- 누구나 UPDATE 가능 (카운트 증가용)
CREATE POLICY "visitor_stats_update_public"
ON visitor_stats
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 3단계: 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'visitor_stats'
ORDER BY cmd, policyname;
