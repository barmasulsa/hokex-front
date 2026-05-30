-- 알림 테이블 및 RLS 정책 진단 SQL

-- 1. 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcements'
) AS table_exists;

-- 2. 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'announcements'
ORDER BY ordinal_position;

-- 3. RLS 활성화 여부 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'announcements';

-- 4. RLS 정책 확인
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
WHERE tablename = 'announcements';

-- 5. 현재 사용자 확인
SELECT current_user, session_user;

-- 6. 현재 사용자의 이메일 확인 (auth.users에서)
SELECT id, email, role
FROM auth.users
WHERE id = auth.uid();

-- 7. 테스트: 알림 조회 시도
SELECT COUNT(*) as announcement_count
FROM announcements;

-- 8. 테스트: 알림 생성 시도 (실제로 생성하지 않고 권한만 확인)
-- 이 쿼리는 실행하지 말고, 관리자 페이지에서 생성 시도 후 에러 메시지를 확인하세요
