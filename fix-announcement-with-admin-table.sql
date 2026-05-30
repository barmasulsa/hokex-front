-- 알림 테이블 RLS 정책 수정 (관리자 테이블 사용)
-- 이 방법이 가장 확실하고 안전합니다

-- 1. admin_users 테이블이 있는지 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
) AS admin_table_exists;

-- 2. admin_users 테이블에 현재 사용자가 있는지 확인
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email,
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) as is_in_admin_table;

-- 3. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;

-- 4. 새로운 RLS 정책 생성
-- 조회 정책: 모든 사용자가 활성화된 알림 조회 가능
CREATE POLICY "Anyone can view active announcements"
ON announcements FOR SELECT
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- 관리 정책: admin_users 테이블에 있는 사용자만 관리 가능
CREATE POLICY "Admins can manage announcements"
ON announcements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- 5. 현재 사용자를 admin_users에 추가 (아직 없다면)
INSERT INTO admin_users (user_id, email)
SELECT 
  id,
  email
FROM auth.users
WHERE email IN ('lcw5506@naver.com', 'admin@hokex.kr')
ON CONFLICT (user_id) DO NOTHING;

-- 6. 최종 확인
SELECT 
  au.email,
  au.created_at,
  'admin_users 테이블에 등록됨' as status
FROM admin_users au
WHERE au.email IN ('lcw5506@naver.com', 'admin@hokex.kr');

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✓ RLS 정책이 수정되었습니다';
  RAISE NOTICE '✓ 관리자가 admin_users 테이블에 추가되었습니다';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 위의 "최종 확인" 쿼리 결과를 확인하세요';
  RAISE NOTICE '2. 관리자 이메일이 표시되어야 합니다';
  RAISE NOTICE '3. 관리자 페이지에서 알림 생성을 시도하세요';
END $$;
