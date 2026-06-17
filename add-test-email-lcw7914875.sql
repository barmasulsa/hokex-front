-- 테스트용 이메일 추가: lcw7914875@gmail.com
-- 초기 비밀번호: 123456

-- 1. Stibee 구독자 테이블에 추가
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

-- 2. Auth 계정 생성 (트리거가 자동으로 생성하지만, 수동으로도 확인)
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

-- 3. 확인
SELECT 
  '=== 추가 완료 확인 ===' as section,
  (SELECT COUNT(*) FROM public.stibee_subscribers WHERE email = 'lcw7914875@gmail.com') as "Stibee 구독자",
  (SELECT COUNT(*) FROM auth.users WHERE email = 'lcw7914875@gmail.com') as "Auth 계정",
  (SELECT COUNT(*) FROM public.user_profiles WHERE email = 'lcw7914875@gmail.com') as "프로필";

-- 4. 로그인 정보 출력
SELECT 
  '=== 로그인 정보 ===' as section,
  'lcw7914875@gmail.com' as "이메일",
  '123456' as "초기 비밀번호",
  'https://hokex.vercel.app' as "로그인 페이지";
