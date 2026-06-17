-- 자동 회원가입 시스템 활성화
-- 뉴스레터 구독자가 추가되면 자동으로 Auth 계정 생성 (초기 비밀번호: 123456)

-- STEP 1: pgcrypto extension 활성화 확인
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: 자동 계정 생성 함수 재생성
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

    RAISE NOTICE '✅ Created auth account for: % (password: 123456)', NEW.email;
  ELSE
    RAISE NOTICE 'ℹ️  Auth account already exists for: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- STEP 3: 트리거 재생성
DROP TRIGGER IF EXISTS create_auth_on_subscriber_insert ON public.stibee_subscribers;

CREATE TRIGGER create_auth_on_subscriber_insert
  AFTER INSERT ON public.stibee_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auth_account_for_subscriber();

-- STEP 4: 기존 구독자 중 계정이 없는 사람들에게 계정 생성
DO $$
DECLARE
  subscriber_record RECORD;
  new_user_id uuid;
  created_count integer := 0;
  skipped_count integer := 0;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '기존 구독자 계정 생성 시작...';
  RAISE NOTICE '==============================================';

  FOR subscriber_record IN 
    SELECT DISTINCT email 
    FROM public.stibee_subscribers 
    WHERE email IS NOT NULL
  LOOP
    -- 이미 Auth 계정이 있는지 확인
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE email = subscriber_record.email;

    IF new_user_id IS NULL THEN
      -- Auth 계정 생성
      BEGIN
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
          subscriber_record.email,
          crypt('123456', gen_salt('bf')),
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
        VALUES (new_user_id, subscriber_record.email, FALSE, NULL)
        ON CONFLICT (id) DO NOTHING;

        created_count := created_count + 1;
        RAISE NOTICE '✅ Created account: % (password: 123456)', subscriber_record.email;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to create account for %: %', subscriber_record.email, SQLERRM;
      END;
    ELSE
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ 완료!';
  RAISE NOTICE '   - 새로 생성된 계정: %개', created_count;
  RAISE NOTICE '   - 이미 있던 계정: %개', skipped_count;
  RAISE NOTICE '==============================================';
END;
$$;

-- STEP 5: 설정 확인
DO $$
DECLARE
  trigger_count integer;
  subscriber_count integer;
  auth_count integer;
BEGIN
  -- 트리거 확인
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'create_auth_on_subscriber_insert'
    AND event_object_table = 'stibee_subscribers';

  -- 구독자 수 확인
  SELECT COUNT(DISTINCT email) INTO subscriber_count
  FROM public.stibee_subscribers
  WHERE email IS NOT NULL;

  -- Auth 계정 수 확인
  SELECT COUNT(*) INTO auth_count
  FROM auth.users;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🎉 자동 회원가입 시스템 활성화 완료!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 현황:';
  RAISE NOTICE '   - 트리거 상태: %', CASE WHEN trigger_count > 0 THEN '✅ 활성화됨' ELSE '❌ 비활성화됨' END;
  RAISE NOTICE '   - 뉴스레터 구독자: %명', subscriber_count;
  RAISE NOTICE '   - 로그인 계정: %개', auth_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 사용 방법:';
  RAISE NOTICE '   1. 뉴스레터를 구독하면 자동으로 계정이 생성됩니다';
  RAISE NOTICE '   2. 초기 비밀번호: 123456';
  RAISE NOTICE '   3. 이메일 주소와 비밀번호로 로그인하세요';
  RAISE NOTICE '   4. 로그인 후 프로필에서 비밀번호를 변경할 수 있습니다';
  RAISE NOTICE '';
  RAISE NOTICE '📝 테스트 방법:';
  RAISE NOTICE '   - 새로운 이메일을 stibee_subscribers 테이블에 추가하면';
  RAISE NOTICE '   - 자동으로 Auth 계정이 생성됩니다';
  RAISE NOTICE '==============================================';
END;
$$;
