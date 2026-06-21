-- =====================================================
-- 커뮤니티 기능 진단 SQL
-- =====================================================
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- 1. board_categories 테이블 확인
SELECT '=== 1. board_categories 테이블 존재 확인 ===' as step;
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'board_categories';

-- 2. board_categories 데이터 확인
SELECT '=== 2. board_categories 데이터 확인 ===' as step;
SELECT * FROM board_categories ORDER BY "order";

-- 3. board_categories RLS 정책 확인
SELECT '=== 3. board_categories RLS 정책 확인 ===' as step;
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
WHERE tablename = 'board_categories';

-- 4. posts 테이블 확인
SELECT '=== 4. posts 테이블 존재 확인 ===' as step;
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'posts';

-- 5. user_profiles 테이블 확인 (communityService.ts에서 조인에 사용)
SELECT '=== 5. user_profiles 테이블 존재 확인 ===' as step;
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';

-- 6. user_profiles 컬럼 확인
SELECT '=== 6. user_profiles 컬럼 확인 ===' as step;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 7. 현재 사용자 권한으로 board_categories 조회 테스트
SELECT '=== 7. board_categories 조회 테스트 (현재 사용자 권한) ===' as step;
SELECT 
  id, 
  name, 
  description, 
  icon, 
  "order", 
  is_active
FROM board_categories 
WHERE is_active = true 
ORDER BY "order";

-- 8. RLS 활성화 상태 확인
SELECT '=== 8. RLS 활성화 상태 확인 ===' as step;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('board_categories', 'posts', 'comments', 'likes', 'reports');

-- =====================================================
-- 진단 결과 해석:
-- =====================================================
-- 1. board_categories 테이블이 없다면 → create-community-tables.sql 실행 필요
-- 2. board_categories 데이터가 없다면 → INSERT 문 실행 필요
-- 3. board_categories RLS 정책이 없다면 → RLS 정책 생성 필요
-- 4. user_profiles 테이블이 없다면 → 생성 필요 또는 communityService.ts 수정 필요
-- 5. 조회 테스트에서 데이터가 안 나온다면 → RLS 정책 문제
-- =====================================================
