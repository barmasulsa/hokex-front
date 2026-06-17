-- ============================================
-- 🔍 sadpandadayo@gmail.com 현재 상태 확인
-- ============================================

-- STEP 1: stibee_subscribers 테이블에 있는지 확인
SELECT 
  '1. stibee_subscribers 확인' as step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 있음'
    ELSE '❌ 없음 - FIX-LOGIN-NOW.sql 실행 필요'
  END as status,
  COUNT(*) as count
FROM stibee_subscribers 
WHERE email = 'sadpandadayo@gmail.com';

-- STEP 2: auth.users에 계정이 있는지 확인
SELECT 
  '2. auth.users 확인' as step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 계정 있음'
    ELSE '❌ 계정 없음 - 회원가입 필요'
  END as status,
  COUNT(*) as count
FROM auth.users 
WHERE email = 'sadpandadayo@gmail.com';

-- STEP 3: user_profiles 확인
SELECT 
  '3. user_profiles 확인' as step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 프로필 있음'
    ELSE '⚠️ 프로필 없음 (로그인 후 자동 생성됨)'
  END as status,
  COUNT(*) as count
FROM user_profiles 
WHERE email = 'sadpandadayo@gmail.com';

-- 최종 판단
SELECT 
  '📊 최종 진단' as step,
  CASE 
    WHEN (SELECT COUNT(*) FROM stibee_subscribers WHERE email = 'sadpandadayo@gmail.com') = 0 
    THEN '❌ FIX-LOGIN-NOW.sql 먼저 실행하세요'
    WHEN (SELECT COUNT(*) FROM auth.users WHERE email = 'sadpandadayo@gmail.com') = 0 
    THEN '⚠️ 구독자 확인은 통과하지만 계정이 없습니다. 회원가입이 필요합니다.'
    ELSE '✅ 모든 준비 완료! 로그인 가능합니다.'
  END as diagnosis;
