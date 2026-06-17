-- ============================================================
-- 500 DATABASE SCHEMA ERROR 긴급 수정
-- ============================================================
-- 목적: "Database error querying schema" 500 에러 즉시 해결
-- ============================================================

-- 1단계: pgcrypto 확장 확인 및 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2단계: user_profiles 테이블이 존재하는지 확인하고, 없으면 생성
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- user_profiles 테이블 생성
        CREATE TABLE public.user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            nickname TEXT UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- RLS 활성화
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- RLS 정책 생성
        CREATE POLICY "Users can view their own profile"
            ON public.user_profiles FOR SELECT
            USING (auth.uid() = id);
        
        CREATE POLICY "Users can update their own profile"
            ON public.user_profiles FOR UPDATE
            USING (auth.uid() = id);
        
        RAISE NOTICE 'user_profiles 테이블 생성 완료';
    ELSE
        RAISE NOTICE 'user_profiles 테이블이 이미 존재합니다';
    END IF;
END $$;

-- 3단계: 모든 컬럼이 NULL 허용 또는 DEFAULT 값이 있는지 확인
DO $$
BEGIN
    -- email 컬럼이 NOT NULL이 아닌지 확인하고, NOT NULL이면 수정
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'email'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.user_profiles 
        ALTER COLUMN email DROP NOT NULL;
        
        RAISE NOTICE 'email 컬럼 NOT NULL 제약 제거 완료';
    END IF;
END $$;

-- 4단계: auth.users에서 user_profiles 자동 생성 트리거 확인 및 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 (있을 경우)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 새 트리거 생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5단계: 테스트 계정 생성 준비 - 이메일을 stibee_subscribers에 추가
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('sadpandadayo@gmail.com', NOW())
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 확인 쿼리
-- ============================================================
SELECT 
    '✅ pgcrypto 확장' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN '활성화됨' ELSE '❌ 비활성화됨' END AS status
UNION ALL
SELECT 
    '✅ user_profiles 테이블' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN '존재함' ELSE '❌ 없음' END AS status
UNION ALL
SELECT 
    '✅ 트리거 함수' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'handle_new_user'
    ) THEN '생성됨' ELSE '❌ 없음' END AS status
UNION ALL
SELECT 
    '✅ 트리거' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN '생성됨' ELSE '❌ 없음' END AS status
UNION ALL
SELECT 
    '✅ stibee_subscribers에 이메일' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM public.stibee_subscribers
        WHERE email = 'sadpandadayo@gmail.com'
    ) THEN '존재함' ELSE '❌ 없음' END AS status;

-- ============================================================
-- 다음 단계 안내
-- ============================================================
-- 1. 위 SQL을 Supabase SQL Editor에서 실행
-- 2. 모든 체크 항목이 ✅로 표시되는지 확인
-- 3. 로그인 페이지에서 sadpandadayo@gmail.com / 123456으로 로그인 시도
-- 4. 자동으로 계정이 생성되고 로그인되어야 함
-- ============================================================
