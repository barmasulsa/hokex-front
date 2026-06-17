-- ============================================
-- 🔍 로그인 실패 진단 + 비밀번호 재설정
-- ============================================
-- 문제: 이메일 또는 비밀번호가 올바르지 않습니다
-- 해결: 계정 상태 확인 + 비밀번호 올바르게 재설정
-- ============================================

-- Step 1: 현재 계정 상태 확인
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id_found UUID;
  has_password BOOLEAN;
  email_confirmed BOOLEAN;
  password_hash TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📊 Step 1: 계정 상태 확인';
  RAISE NOTICE '==============================================';
  
  -- auth.users에서 계정 확인
  SELECT 
    id,
    encrypted_password IS NOT NULL AND encrypted_password != '',
    email_confirmed_at IS NOT NULL,
    encrypted_password
  INTO 
    user_id_found,
    has_password,
    email_confirmed,
    password_hash
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com';
  
  user_exists := user_id_found IS NOT NULL;
  
  RAISE NOTICE '✅ 계정 존재: %', user_exists;
  
  IF user_exists THEN
    RAISE NOTICE '   - User ID: %', user_id_found;
    RAISE NOTICE '   - 비밀번호 설정됨: %', has_password;
    RAISE NOTICE '   - 이메일 확인됨: %', email_confirmed;
    RAISE NOTICE '   - 비밀번호 해시 (첫 20자): %', SUBSTRING(password_hash, 1, 20);
  ELSE
    RAISE NOTICE '❌ auth.users에 계정이 없습니다!';
  END IF;
  
  -- stibee_subscribers 확인
  IF EXISTS (SELECT 1 FROM public.stibee_subscribers WHERE email = 'lcw7914875@gmail.com') THEN
    RAISE NOTICE '✅ stibee_subscribers에 존재';
  ELSE
    RAISE NOTICE '❌ stibee_subscribers에 없음';
  END IF;
  
  -- user_profiles 확인
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'lcw7914875@gmail.com') THEN
    RAISE NOTICE '✅ user_profiles에 존재';
  ELSE
    RAISE NOTICE '❌ user_profiles에 없음';
  END IF;
END;
$$;

-- Step 2: 비밀번호 재설정 (Supabase 내장 함수 사용)
DO $$
DECLARE
  user_id_found UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🔑 Step 2: 비밀번호 재설정';
  RAISE NOTICE '==============================================';
  
  SELECT id INTO user_id_found
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com';
  
  IF user_id_found IS NOT NULL THEN
    -- Supabase의 내장 비밀번호 해싱을 사용하여 업데이트
    -- crypt 함수를 사용 (pgcrypto가 활성화되어 있어야 함)
    UPDATE auth.users
    SET 
      encrypted_password = crypt('123456', gen_salt('bf')),
      updated_at = NOW()
    WHERE id = user_id_found;
    
    RAISE NOTICE '✅ 비밀번호가 "123456"으로 재설정되었습니다';
  ELSE
    RAISE NOTICE '❌ 사용자를 찾을 수 없습니다';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 비밀번호 설정 실패: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  pgcrypto 확장이 활성화되지 않은 것 같습니다.';
    RAISE NOTICE '   Supabase Dashboard → Database → Extensions에서';
    RAISE NOTICE '   pgcrypto를 활성화한 후 다시 실행하세요.';
END;
$$;

-- Step 3: 최종 확인
DO $$
DECLARE
  password_hash TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📋 Step 3: 최종 확인';
  RAISE NOTICE '==============================================';
  
  SELECT encrypted_password INTO password_hash
  FROM auth.users 
  WHERE email = 'lcw7914875@gmail.com';
  
  IF password_hash IS NOT NULL AND password_hash != '' THEN
    RAISE NOTICE '✅ 비밀번호 해시: %', SUBSTRING(password_hash, 1, 30) || '...';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '🎯 로그인 정보';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '이메일: lcw7914875@gmail.com';
    RAISE NOTICE '비밀번호: 123456';
    RAISE NOTICE '로그인 URL: https://hokex.vercel.app';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 이제 로그인을 다시 시도해보세요!';
  ELSE
    RAISE NOTICE '❌ 비밀번호가 설정되지 않았습니다';
  END IF;
END;
$$;
