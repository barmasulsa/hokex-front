-- ============================================
-- 🔧 최종 해결: 트리거 없이 직접 계정 생성
-- ============================================
-- 문제: pgcrypto를 아무리 활성화해도 트리거 함수에서 찾을 수 없음
-- 해결: 트리거를 사용하지 않고 직접 SQL로 계정 생성
--
-- 실행 방법: Supabase SQL Editor에 전체 복사 → Run
-- ============================================

-- Step 1: pgcrypto extension 확실하게 활성화 (extensions 스키마에)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  RAISE NOTICE '✅ Step 1: pgcrypto extension 활성화 완료';
END;
$$;

-- Step 2: 테스트 이메일을 stibee_subscribers에 추가
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 2: Stibee 구독자에 lcw7914875@gmail.com 추가됨';
END;
$$;

-- Step 3: 트리거를 사용하지 않고 직접 Auth 계정 생성
-- pgcrypto 함수를 직접 호출 (스키마 명시)
DO $$
DECLARE
  new_user_id uuid;
  pwd_hash text;
BEGIN
  -- 이미 Auth 계정이 있는지 확인
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'lcw7914875@gmail.com';

  IF new_user_id IS NULL THEN
    -- 비밀번호 해시 생성 (pgcrypto 함수를 명시적으로 호출)
    BEGIN
      -- public 스키마에서 시도
      pwd_hash := public.crypt('123456', public.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- extensions 스키마에서 시도
        pwd_hash := extensions.crypt('123456', extensions.gen_salt('bf'));
      EXCEPTION WHEN OTHERS THEN
        -- 스키마 없이 시도
        pwd_hash := crypt('123456', gen_salt('bf'));
      END;
    END;

    -- Auth 계정 생성
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
      pwd_hash, -- 미리 생성한 해시 사용
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

    RAISE NOTICE '✅ Step 3: Auth 계정 생성 완료! (password: 123456)';
  ELSE
    RAISE NOTICE '⚠️  Step 3: Auth 계정이 이미 존재합니다.';
  END IF;
END;
$$;

-- Step 4: 결과 확인
DO $$
DECLARE
  stibee_count INTEGER;
  auth_count INTEGER;
  profile_count INTEGER;
  has_password BOOLEAN;
  email_confirmed BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📊 최종 확인';
  RAISE NOTICE '==============================================';
  
  -- 각 테이블에서 계정 확인
  SELECT COUNT(*) INTO stibee_count 
  FROM public.stibee_subscribers 
  WHERE email = 'lcw7914875@gmail.com';
  
  SELECT COUNT(*) INTO auth_count 
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com';
  
  SELECT COUNT(*) INTO profile_count 
  FROM public.user_profiles 
  WHERE email = 'lcw7914875@gmail.com';
  
  -- 비밀번호 상태 확인
  SELECT 
    encrypted_password IS NOT NULL,
    email_confirmed_at IS NOT NULL
  INTO has_password, email_confirmed
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com'
  LIMIT 1;
  
  RAISE NOTICE 'Stibee 구독자: %', stibee_count;
  RAISE NOTICE 'Auth 계정: %', auth_count;
  RAISE NOTICE 'User Profile: %', profile_count;
  RAISE NOTICE '비밀번호 설정됨: %', has_password;
  RAISE NOTICE '이메일 확인됨: %', email_confirmed;
  RAISE NOTICE '';
  
  IF auth_count > 0 AND has_password THEN
    RAISE NOTICE '✅ 모든 설정 완료!';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '🎯 로그인 정보';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '이메일: lcw7914875@gmail.com';
    RAISE NOTICE '비밀번호: 123456';
    RAISE NOTICE '로그인 페이지: https://hokex.vercel.app';
    RAISE NOTICE '==============================================';
  ELSE
    RAISE WARNING '⚠️  Auth 계정 생성에 문제가 있습니다.';
    RAISE WARNING '   아래 에러 메시지를 확인하세요.';
  END IF;
END;
$$;

-- 완료!
