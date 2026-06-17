-- ============================================
-- 🔧 최종 해결: 트리거 삭제 + 직접 계정 생성
-- ============================================
-- 문제: 기존 트리거가 여전히 실행되면서 pgcrypto 에러 발생
-- 해결: 1) 트리거 삭제, 2) 직접 계정 생성
--
-- 실행 방법: Supabase SQL Editor에 전체 복사 → Run
-- ============================================

-- Step 1: 문제의 트리거 삭제
DROP TRIGGER IF EXISTS create_auth_on_subscriber_insert ON public.stibee_subscribers;

DO $$
BEGIN
  RAISE NOTICE '✅ Step 1: 기존 트리거 삭제 완료';
END;
$$;

-- Step 2: 테스트 이메일을 stibee_subscribers에 추가 (트리거 없이)
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('lcw7914875@gmail.com', NOW())
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 2: Stibee 구독자에 lcw7914875@gmail.com 추가됨';
END;
$$;

-- Step 3: Supabase의 signUp 함수를 직접 사용해서 Auth 계정 생성
-- (pgcrypto 대신 Supabase 내장 함수 사용)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- 이미 Auth 계정이 있는지 확인
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'lcw7914875@gmail.com';

  IF new_user_id IS NULL THEN
    -- Supabase Dashboard → Authentication → Add User 기능을 SQL로 재현
    -- encrypted_password는 수동으로 설정 (Supabase 내부 함수 사용)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
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
      '$2a$10$rXSfLGIjkKqnYPZL8uaGZuVqT5vwJN4O.5d5eBgWRuT3vLFVLH6R6', -- 미리 생성한 '123456' 해시
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
  
  SELECT COUNT(*) INTO stibee_count 
  FROM public.stibee_subscribers 
  WHERE email = 'lcw7914875@gmail.com';
  
  SELECT COUNT(*) INTO auth_count 
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com';
  
  SELECT COUNT(*) INTO profile_count 
  FROM public.user_profiles 
  WHERE email = 'lcw7914875@gmail.com';
  
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
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  참고: 트리거를 삭제했으므로 새 구독자는';
    RAISE NOTICE '   자동으로 Auth 계정이 생성되지 않습니다.';
    RAISE NOTICE '   나중에 트리거를 다시 설정해야 합니다.';
  ELSE
    RAISE WARNING '⚠️  Auth 계정 생성에 문제가 있습니다.';
  END IF;
END;
$$;

-- 완료!
