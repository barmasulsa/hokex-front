-- ============================================
-- 닉네임 컬럼 추가 마이그레이션
-- ============================================

-- 1. nickname 컬럼 추가 (이미 있으면 무시)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2. unique constraint 추가 (중복 닉네임 방지)
DO $$ 
BEGIN
    -- 기존 constraint가 있으면 먼저 삭제
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_nickname'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT unique_nickname;
    END IF;
    
    -- 새로 추가
    ALTER TABLE user_profiles
    ADD CONSTRAINT unique_nickname UNIQUE (nickname);
END $$;

-- 3. 컬럼 설명 추가
COMMENT ON COLUMN user_profiles.nickname IS '사용자 닉네임 (자동으로 "판다"가 붙음, 중복 불가)';

-- 4. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname 
ON user_profiles(nickname) 
WHERE nickname IS NOT NULL;

-- ============================================
-- 확인 쿼리
-- ============================================

-- 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 제약조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass;

-- 현재 데이터 확인
SELECT 
    id, 
    email, 
    nickname, 
    is_admin, 
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
