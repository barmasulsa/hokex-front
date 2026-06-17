-- 빠른 로그인 진단 SQL
-- Supabase SQL Editor에서 실행하세요

-- ============================================
-- 1. 전체 시스템 상태
-- ============================================
SELECT 
  '=== 시스템 상태 ===' as section,
  (SELECT COUNT(*) FROM public.stibee_subscribers) as "구독자 수",
  (SELECT COUNT(*) FROM auth.users) as "Auth 계정 수",
  (SELECT COUNT(*) FROM auth.users WHERE encrypted_password IS NOT NULL) as "비밀번호 설정된 계정",
  (SELECT COUNT(*) FROM public.user_profiles) as "프로필 수";

-- ============================================
-- 2. 최근 생성된 Auth 계정 (최근 5개)
-- ============================================
SELECT 
  '=== 최근 Auth 계정 ===' as section,
  email as "이메일",
  created_at as "생성일시",
  email_confirmed_at IS NOT NULL as "이메일 확인됨",
  encrypted_password IS NOT NULL as "비밀번호 있음",
  LENGTH(encrypted_password) as "비밀번호 길이"
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 3. 최근 Stibee 구독자 (최근 5개)
-- ============================================
SELECT 
  '=== 최근 Stibee 구독자 ===' as section,
  email as "이메일",
  last_synced_at as "마지막 동기화"
FROM public.stibee_subscribers
ORDER BY last_synced_at DESC NULLS LAST
LIMIT 5;

-- ============================================
-- 4. 문제가 있는 계정들 찾기
-- ============================================
-- 4-1. 비밀번호 없는 Auth 계정
SELECT 
  '=== ❌ 비밀번호 없는 Auth 계정 ===' as section,
  email as "이메일",
  created_at as "생성일시"
FROM auth.users
WHERE encrypted_password IS NULL OR encrypted_password = ''
LIMIT 5;

-- 4-2. Auth 계정은 있는데 Profile 없는 경우
SELECT 
  '=== ❌ Profile 없는 Auth 계정 ===' as section,
  u.email as "이메일",
  u.created_at as "생성일시"
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
LIMIT 5;

-- 4-3. Stibee 구독자인데 Auth 계정 없는 경우
SELECT 
  '=== ❌ Auth 계정 없는 구독자 ===' as section,
  s.email as "이메일",
  s.last_synced_at as "마지막 동기화"
FROM public.stibee_subscribers s
LEFT JOIN auth.users u ON s.email = u.email
WHERE u.id IS NULL
LIMIT 5;

-- ============================================
-- 5. 안내 메시지
-- ============================================
SELECT 
  '=== 💡 다음 단계 ===' as section,
  '위 결과를 확인하고 문제가 있는 부분을 공유해주세요.' as "메시지",
  '특히 "❌"로 시작하는 섹션에 데이터가 있다면 문제가 있는 것입니다.' as "주의사항";
