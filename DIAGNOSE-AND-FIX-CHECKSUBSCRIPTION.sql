-- ============================================
-- 🔍 구독자 확인 문제 진단 및 해결
-- ============================================
-- 문제: Edge Function이 외부 Stibee API를 확인하므로
--       로컬 DB에만 있는 테스트 이메일이 구독자로 인식 안 됨
-- 
-- 해결: 1) Edge Function 확인, 2) 테스트 환경 설정
-- ============================================

-- Step 1: stibee_subscribers 테이블에 이메일이 있는지 확인
DO $$
DECLARE
  subscriber_exists BOOLEAN;
  subscriber_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📊 Step 1: stibee_subscribers 테이블 확인';
  RAISE NOTICE '==============================================';
  
  SELECT COUNT(*) > 0, COUNT(*)
  INTO subscriber_exists, subscriber_count
  FROM public.stibee_subscribers
  WHERE email = 'lcw7914875@gmail.com';
  
  IF subscriber_exists THEN
    RAISE NOTICE '✅ stibee_subscribers 테이블에 이메일 존재: % 개', subscriber_count;
  ELSE
    RAISE NOTICE '❌ stibee_subscribers 테이블에 이메일 없음';
  END IF;
  
  -- 테이블 데이터 출력
  RAISE NOTICE '';
  RAISE NOTICE '테이블 내용:';
  FOR subscriber_exists IN
    SELECT TRUE FROM public.stibee_subscribers WHERE email = 'lcw7914875@gmail.com' LIMIT 5
  LOOP
    RAISE NOTICE '  - lcw7914875@gmail.com';
  END LOOP;
END;
$$;

-- Step 2: Auth 계정 확인
DO $$
DECLARE
  auth_exists BOOLEAN;
  has_password BOOLEAN;
  email_confirmed BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📊 Step 2: Auth 계정 확인';
  RAISE NOTICE '==============================================';
  
  SELECT 
    COUNT(*) > 0,
    bool_or(encrypted_password IS NOT NULL),
    bool_or(email_confirmed_at IS NOT NULL)
  INTO auth_exists, has_password, email_confirmed
  FROM auth.users
  WHERE email = 'lcw7914875@gmail.com';
  
  IF auth_exists THEN
    RAISE NOTICE '✅ Auth 계정 존재';
    RAISE NOTICE '비밀번호 설정: %', has_password;
    RAISE NOTICE '이메일 확인: %', email_confirmed;
  ELSE
    RAISE NOTICE '❌ Auth 계정 없음';
  END IF;
END;
$$;

-- Step 3: Edge Function이 어떤 방식으로 구독자를 확인하는지 추론
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🔍 Step 3: 문제 분석';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '현재 상황:';
  RAISE NOTICE '  1. stibee_subscribers 테이블에 이메일이 있음';
  RAISE NOTICE '  2. Auth 계정도 생성됨';
  RAISE NOTICE '  3. 하지만 로그인 시 SUBSCRIBER_ONLY 에러 발생';
  RAISE NOTICE '';
  RAISE NOTICE '원인 추정:';
  RAISE NOTICE '  - Edge Function이 DB 테이블이 아닌 외부 Stibee API를 호출';
  RAISE NOTICE '  - 로컬 DB에만 있는 테스트 이메일은 API에서 찾을 수 없음';
  RAISE NOTICE '';
  RAISE NOTICE '해결 방법:';
  RAISE NOTICE '  1. Edge Function 코드 확인 필요';
  RAISE NOTICE '  2. Edge Function이 DB 테이블도 확인하도록 수정';
  RAISE NOTICE '  3. 또는 AuthContext.tsx에서 checkSubscription을';
  RAISE NOTICE '     DB 테이블 직접 조회로 임시 변경';
END;
$$;

-- Step 4: 임시 해결책 - RPC 함수 생성 (DB 테이블 직접 확인)
CREATE OR REPLACE FUNCTION public.check_subscriber_in_db(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.stibee_subscribers 
    WHERE email = user_email
  );
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Step 4: RPC 함수 생성 완료';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 함수: check_subscriber_in_db(user_email TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE '사용 방법 (프론트엔드):';
  RAISE NOTICE '  const { data } = await supabase.rpc(';
  RAISE NOTICE '    ''check_subscriber_in_db'',';
  RAISE NOTICE '    { user_email: email }';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  1. AuthContext.tsx의 checkSubscription 함수를';
  RAISE NOTICE '     이 RPC 함수를 사용하도록 수정';
  RAISE NOTICE '  2. 또는 Edge Function 코드를 수정하여';
  RAISE NOTICE '     DB 테이블도 확인하도록 변경';
END;
$$;

-- Step 5: 테스트
DO $$
DECLARE
  is_subscriber BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '🧪 Step 5: RPC 함수 테스트';
  RAISE NOTICE '==============================================';
  
  SELECT public.check_subscriber_in_db('lcw7914875@gmail.com')
  INTO is_subscriber;
  
  IF is_subscriber THEN
    RAISE NOTICE '✅ 테스트 성공: lcw7914875@gmail.com는 구독자입니다';
  ELSE
    RAISE NOTICE '❌ 테스트 실패: 이메일을 찾을 수 없습니다';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📝 다음 작업';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '프론트엔드 코드 수정 필요:';
  RAISE NOTICE 'AuthContext.tsx의 checkSubscription 함수를 다음과 같이 수정:';
  RAISE NOTICE '';
  RAISE NOTICE 'const checkSubscription = async (email: string): Promise<boolean> => {';
  RAISE NOTICE '  try {';
  RAISE NOTICE '    // Edge Function 대신 DB 직접 확인';
  RAISE NOTICE '    const { data, error } = await supabase.rpc(';
  RAISE NOTICE '      ''check_subscriber_in_db'',';
  RAISE NOTICE '      { user_email: email }';
  RAISE NOTICE '    );';
  RAISE NOTICE '    ';
  RAISE NOTICE '    if (error) return false;';
  RAISE NOTICE '    return data === true;';
  RAISE NOTICE '  } catch {';
  RAISE NOTICE '    return false;';
  RAISE NOTICE '  }';
  RAISE NOTICE '};';
END;
$$;
