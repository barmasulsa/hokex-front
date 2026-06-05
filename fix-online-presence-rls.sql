-- 현재 접속 인원 추적 시스템 RLS 정책 수정

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON online_users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON online_users;
DROP POLICY IF EXISTS "Enable update access for all users" ON online_users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON online_users;
DROP POLICY IF EXISTS "Allow anon to read online users" ON online_users;
DROP POLICY IF EXISTS "Allow anon to insert online users" ON online_users;
DROP POLICY IF EXISTS "Allow anon to update online users" ON online_users;
DROP POLICY IF EXISTS "Allow anon to delete online users" ON online_users;

-- 2. 새로운 정책 생성 (익명 사용자 포함 모든 사용자 허용)
CREATE POLICY "Anyone can read online users"
  ON online_users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert online users"
  ON online_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update online users"
  ON online_users FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete online users"
  ON online_users FOR DELETE
  USING (true);

-- 3. 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'online_users'
ORDER BY ordinal_position;

-- 4. 테스트: 현재 활성 세션 수 확인
SELECT COUNT(*) as active_sessions
FROM online_users
WHERE last_seen >= NOW() - INTERVAL '30 seconds';
