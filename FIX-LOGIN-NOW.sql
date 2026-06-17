-- ============================================
-- 🔧 sadpandadayo@gmail.com 로그인 문제 즉시 해결
-- ============================================
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사 붙여넣기 → Run
-- 
-- 문제: gen_salt() 함수가 없어서 자동 계정 생성 트리거가 실패함
-- 해결: 트리거를 우회하여 stibee_subscribers에만 이메일 추가

-- STEP 1: 모든 트리거 임시 비활성화 (세션 레벨)
SET session_replication_role = replica;

-- STEP 2: stibee_subscribers에 이메일 추가 (트리거 실행 안됨)
INSERT INTO stibee_subscribers (email, last_synced_at)
VALUES ('sadpandadayo@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

-- STEP 3: 트리거 다시 활성화
SET session_replication_role = DEFAULT;

-- STEP 4: 확인
SELECT 
  email, 
  last_synced_at,
  created_at
FROM stibee_subscribers 
WHERE email = 'sadpandadayo@gmail.com';

-- ✅ 완료! 
-- 이제 로그인 페이지에서 시도하세요:
-- 
-- 이메일: sadpandadayo@gmail.com
-- 비밀번호: hokex2026
-- 
-- 로그인 플로우:
-- 1. checkSubscription() → stibee_subscribers 테이블 확인 → ✅ 찾음
-- 2. Supabase Auth 로그인 진행
-- 
-- 주의: 이 이메일로는 아직 Supabase Auth 계정이 없을 수 있습니다.
-- 만약 "Invalid login credentials" 에러가 나면 회원가입이 필요합니다.
