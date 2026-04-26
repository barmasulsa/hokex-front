-- HOKEX RLS 정책 수정
-- Supabase SQL Editor에서 이 쿼리를 실행하세요

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Events are insertable by authenticated users" ON events;
DROP POLICY IF EXISTS "Events are updatable by authenticated users" ON events;

-- 새로운 정책 생성 (익명 사용자도 읽기 가능)
CREATE POLICY "Enable read access for all users"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
  ON events FOR DELETE
  TO authenticated
  USING (true);
