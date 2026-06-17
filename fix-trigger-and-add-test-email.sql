-- ============================================
-- 🔧 최종 로그인 문제 해결 SQL
-- ============================================
-- 문제: gen_salt() 함수를 찾을 수 없음 (pgcrypto 미활성화)
-- 해결: pgcrypto 활성화 + 트리거 함수 재생성 + 테스트 계정 추가
-- 
-- 실행 방법: Supabase SQL Editor에 전체 복사 → Run
-- ============================================

-- Step 1: pgcrypto extension 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Step 1: pgcrypto extension 활성화 완료';
END;
$$;

-- Step 2: 트리거 함수 재생성 (pgcrypto 사용 가능하도록)
CREATE OR REPLACE FUNCTION public.create_auth_account_for_subscriber()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- 이미 Auth 계정이 있는지 확인
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = NEW.email;

  -- Auth 계정이 없으면 생성
  IF new_user_id IS NULL THEN
    -- Supabase Auth에 사용자 생성 (초기 비밀번호: 123456)
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
      NEW.email,
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
    VALUES (new_user_id, NEW.email, FALSE, NULL)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created auth account for subscriber: % with initial password 123456', NEW.email;
  ELSE
    RAISE NOTICE 'Auth account already exists for: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Step 2: 트리거 함수 재생성 완료 (pgcrypto 지원)';
END;
$$;

-- Step 3: 테스트 이메일을 stibee_subscribers에 추가
-- 트리거가 자동으로 Auth 계정 생성함
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 3: Stibee 구독자에 lcw7914875@gmail.com 추가됨';
  RAISE NOTICE '   → 트리거가 자동으로 Auth 계정 생성을 시도합니다...';
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
    RAISE WARNING '   quick-login-diagnosis.sql을 실행하여 문제를 진단하세요.';
  END IF;
END;
$$;

-- 완료!
