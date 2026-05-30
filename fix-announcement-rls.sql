-- 알림 테이블 RLS 정책 수정
-- 기존 정책 삭제 후 새로운 정책 적용

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can manage announcements" ON announcements;

-- 2. 조회 정책: 모든 사용자가 활성화된 알림 조회 가능
CREATE POLICY "Anyone can view active announcements"
ON announcements FOR SELECT
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- 3. 관리 정책: 특정 이메일을 가진 사용자만 모든 작업 가능
CREATE POLICY "Admins can manage announcements"
ON announcements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('lcw5506@naver.com', 'admin@hokex.kr')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('lcw5506@naver.com', 'admin@hokex.kr')
  )
);

-- 4. 현재 사용자 확인 (디버깅용)
SELECT 
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email,
  (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('lcw5506@naver.com', 'admin@hokex.kr') as is_admin;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✓ RLS 정책이 수정되었습니다.';
  RAISE NOTICE '✓ 관리자 이메일: lcw5506@naver.com, admin@hokex.kr';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 위의 "현재 사용자 확인" 쿼리 결과를 확인하세요';
  RAISE NOTICE '2. is_admin이 true인지 확인하세요';
  RAISE NOTICE '3. false라면 현재 로그인한 이메일이 관리자 목록에 없는 것입니다';
END $$;
