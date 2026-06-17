-- ============================================
-- 로그인 문제 해결: pgcrypto extension 활성화 + 테스트 계정 추가
-- ============================================
-- 실행 방법: Supabase SQL Editor에 전체 복사 → Run

-- Step 1: pgcrypto extension 활성화
-- 이것이 없으면 gen_salt() 함수를 사용할 수 없음
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: extension 활성화 확인
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE NOTICE '✅ pgcrypto extension이 활성화되었습니다.';
  ELSE
    RAISE EXCEPTION '❌ pgcrypto extension 활성화 실패';
  END IF;
END;
$$;

-- Step 3: 테스트 이메일 추가 (lcw7914875@gmail.com)
-- Stibee 구독자 테이블에 추가
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

-- Step 4: 수동으로 Auth 계정 확인 및 생성
-- (트리거가 작동하지 않을 수 있으므로 수동으로 확인)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- 이미 Auth 계정이 있는지 확인
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'lcw7914875@gmail.com';

  -- Auth 계정이 없으면 생성
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'lcw7914875@gmail.com',
      crypt('123456', gen_salt('bf')), -- 초기 비밀번호: 123456
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- user_profiles 테이블에도 추가
    INSERT INTO public.user_profiles (id, email, is_admin, nickname)
    VALUES (new_user_id, 'lcw7914875@gmail.com', FALSE, NULL)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Created auth account for lcw7914875@gmail.com with password: 123456';
  ELSE
    RAISE NOTICE '✅ Auth account already exists for lcw7914875@gmail.com';
  END IF;
END;
$$;

-- Step 5: 확인
SELECT 
  '=== ✅ 추가 완료 확인 ===' as section,
  (SELECT COUNT(*) FROM public.stibee_subscribers WHERE email = 'lcw7914875@gmail.com') as "Stibee 구독자",
  (SELECT COUNT(*) FROM auth.users WHERE email = 'lcw7914875@gmail.com') as "Auth 계정",
  (SELECT COUNT(*) FROM public.user_profiles WHERE email = 'lcw7914875@gmail.com') as "프로필";

-- Step 6: 비밀번호 상태 확인
SELECT 
  '=== 🔑 비밀번호 확인 ===' as section,
  email as "이메일",
  encrypted_password IS NOT NULL as "비밀번호 설정됨",
  LENGTH(encrypted_password) as "암호화된 비밀번호 길이",
  email_confirmed_at IS NOT NULL as "이메일 확인됨"
FROM auth.users
WHERE email = 'lcw7914875@gmail.com';

-- Step 7: 로그인 정보 출력
SELECT 
  '=== 🎯 로그인 정보 ===' as section,
  'lcw7914875@gmail.com' as "이메일",
  '123456' as "초기 비밀번호",
  'https://hokex.vercel.app' as "로그인 페이지";

-- ============================================
-- 완료!
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ 테스트 계정 생성 완료!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '이메일: lcw7914875@gmail.com';
  RAISE NOTICE '비밀번호: 123456';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. https://hokex.vercel.app 접속';
  RAISE NOTICE '2. 위 이메일과 비밀번호로 로그인 시도';
  RAISE NOTICE '3. 로그인 결과를 알려주세요';
  RAISE NOTICE '==============================================';
END;
$$;
