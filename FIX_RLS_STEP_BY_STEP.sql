-- Step 1: 현재 정책 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';

-- Step 2: 기존 정책 모두 삭제 (IF EXISTS 사용)
DROP POLICY IF EXISTS "Allow public read access to all events" ON events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON events;
DROP POLICY IF EXISTS "Allow authenticated update" ON events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON events;

-- Step 3: 새 정책 생성
CREATE POLICY "Allow public read access to all events"
ON events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated insert"
ON events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
ON events
FOR DELETE
TO authenticated
USING (true);

-- Step 4: RLS 활성화 확인
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Step 5: 결과 확인
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'events';
