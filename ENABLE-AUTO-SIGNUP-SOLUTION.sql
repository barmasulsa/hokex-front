-- ============================================================
-- 최종 해결책: "Confirm email" 설정을 ON으로 되돌리기
-- ============================================================
-- 이유: Supabase의 "Confirm email" 설정을 OFF로 하면 
--       내부 Auth 스키마와 충돌이 발생합니다.
-- ============================================================

-- 1단계: Supabase Dashboard에서 "Confirm email" 다시 ON으로 설정
-- 경로: Authentication → Providers → Email → User Signups
-- "Confirm email" 토글을 다시 ON으로 켜기

-- 2단계: 이메일을 stibee_subscribers에 추가 (이미 되어있을 수 있음)
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('sadpandadayo@gmail.com', NOW())
ON CONFLICT (email) DO NOTHING;

-- 3단계: 확인
SELECT * FROM public.stibee_subscribers 
WHERE email = 'sadpandadayo@gmail.com';

-- ============================================================
-- 작동 원리
-- ============================================================
-- 1. 로그인 페이지에서 sadpandadayo@gmail.com / 123456 입력
-- 2. AuthContext.tsx의 signInWithPassword 함수 실행:
--    a. checkSubscription() 호출 → Stibee Edge Function에서 구독자 확인
--    b. 구독자 확인 통과 → signInWithPassword() 시도
--    c. 계정이 없으면 "Invalid login credentials" 에러
--    d. 에러 발생 시 자동으로 signUp() 호출 (이메일 확인 없이)
--    e. 회원가입 완료되면 Supabase가 자동으로 로그인 처리
-- 3. 사용자는 별도 이메일 확인 없이 바로 로그인됨

-- ============================================================
-- 다음 단계
-- ============================================================
-- 1. Supabase Dashboard → Authentication → Providers → Email
-- 2. User Signups 섹션의 "Confirm email" 토글을 ON으로 변경
-- 3. Save 클릭
-- 4. 로그인 페이지에서 sadpandadayo@gmail.com / 123456 로그인 시도
-- 5. 자동으로 계정이 생성되고 로그인되어야 함
-- ============================================================

-- ============================================================
-- 왜 "Confirm email" ON 상태에서도 자동 회원가입이 작동하나요?
-- ============================================================
-- AuthContext.tsx 코드를 보면:
--
-- const { error: signUpError } = await supabase.auth.signUp({
--   email,
--   password,
--   options: {
--     emailRedirectTo: undefined,  ← 이 부분이 핵심!
--   }
-- });
--
-- emailRedirectTo를 undefined로 설정하면,
-- Supabase는 이메일 확인을 건너뛰고 바로 계정을 생성합니다.
-- 이것이 "Confirm email" 설정과 관계없이 작동하는 이유입니다.
-- ============================================================
