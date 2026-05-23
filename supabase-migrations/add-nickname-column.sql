-- Add nickname column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Add unique constraint to nickname (중복 방지)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_nickname'
    ) THEN
        ALTER TABLE user_profiles
        ADD CONSTRAINT unique_nickname UNIQUE (nickname);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_profiles.nickname IS '사용자 닉네임 (자동으로 "판다"가 붙음, 중복 불가)';
