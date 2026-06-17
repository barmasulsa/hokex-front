-- 뉴스레터 구독자에게 자동으로 초기 비밀번호(123456) 설정
-- 2026-06-17: 매직 링크 스팸 차단 문제 해결을 위한 변경
-- 승인 시스템 제거: 구독자만 확인하도록 간소화

-- 1. 구독자가 추가될 때 자동으로 Auth 계정 생성하는 함수
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

-- 2. 트리거 생성 (이미 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS create_auth_on_subscriber_insert ON public.stibee_subscribers;

CREATE TRIGGER create_auth_on_subscriber_insert
  AFTER INSERT ON public.stibee_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auth_account_for_subscriber();

-- 3. 기존 구독자들에게도 Auth 계정 생성 (초기 비밀번호: 123456)
DO $$
DECLARE
  subscriber_record RECORD;
  new_user_id uuid;
  created_count integer := 0;
  skipped_count integer := 0;
BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create account for %: %', subscriber_record.email, SQLERRM;
      END;
    ELSE
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration complete. Created: %, Skipped (already exists): %', created_count, skipped_count;
END;
$$;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '초기 비밀번호 시스템 설정 완료';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '- 모든 뉴스레터 구독자에게 Auth 계정 생성됨';
  RAISE NOTICE '- 초기 비밀번호: 123456';
  RAISE NOTICE '- 새로운 구독자는 자동으로 계정 생성됨';
  RAISE NOTICE '- 사용자는 프로필에서 비밀번호 변경 가능';
  RAISE NOTICE '==============================================';
END;
$$;
