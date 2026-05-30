-- 알림 테이블 RLS 간단 수정
-- 방법 1: RLS 임시 비활성화 (테스트용)

-- 현재 상태 확인
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'announcements';

-- RLS 비활성화 (테스트용 - 프로덕션에서는 권장하지 않음)
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- 테스트 후 다시 활성화하려면:
-- ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✓ RLS가 비활성화되었습니다 (테스트용)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 주의: 이 상태에서는 모든 사용자가 알림을 관리할 수 있습니다';
  RAISE NOTICE '⚠️ 테스트 후 반드시 RLS를 다시 활성화하세요';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 관리자 페이지에서 알림 생성을 시도하세요';
  RAISE NOTICE '2. 성공하면 RLS 정책 문제입니다';
  RAISE NOTICE '3. 실패하면 다른 문제입니다 (테이블 구조, 권한 등)';
END $$;
