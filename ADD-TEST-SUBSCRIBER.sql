-- ======================================
-- 🎯 테스트 구독자 추가
-- ======================================

-- 1️⃣ stibee_subscribers 테이블에 이메일 추가
INSERT INTO stibee_subscribers (email, last_synced_at)
VALUES ('sadpandadayo@gmail.com', now())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = now();

-- 2️⃣ 확인
SELECT * FROM stibee_subscribers 
WHERE email = 'sadpandadayo@gmail.com';

-- ======================================
-- ✅ 완료
-- ======================================
-- 이제 sadpandadayo@gmail.com으로 로그인 가능합니다!
-- 
-- 로그인 정보:
-- - 이메일: sadpandadayo@gmail.com  
-- - 비밀번호: hokex2026
-- ======================================
