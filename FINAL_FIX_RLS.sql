-- =======================================================
-- 최종 RLS 수정 스크립트
-- 이 파일을 Supabase SQL Editor에 복사해서 실행하세요
-- =======================================================

-- 1단계: 현재 상태 확인
-- 해당 이벤트가 DB에 있는지 확인
SELECT '=== 1. 이벤트 존재 여부 ===' as step;
SELECT id, title, deleted_at, venue, start_date
FROM events
WHERE id = '0404750f-302c-456b-a5fe-433486610edf';

-- 2단계: 현재 적용된 모든 SELECT 정책 확인
SELECT '=== 2. 현재 SELECT 정책들 ===' as step;
SELECT policyname, roles::text, qual::text as using_expression
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT'
ORDER BY policyname;

-- 3단계: RLS가 활성화되어 있는지 확인
SELECT '=== 3. RLS 활성화 여부 ===' as step;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'events';

-- 4단계: 모든 기존 SELECT 정책을 삭제 (중복 방지)
SELECT '=== 4. 기존 정책 삭제 중... ===' as step;

DROP POLICY IF EXISTS "Allow read access to all non-deleted events" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "public read all events" ON events;
DROP POLICY IF EXISTS "public_read_all_events" ON events;
DROP POLICY IF EXISTS "Allow anon users for crawler" ON events;
DROP POLICY IF EXISTS "Allow authenticated users" ON events;
DROP POLICY IF EXISTS "Admin can view deleted events" ON events;

-- 5단계: 단 하나의 새로운 SELECT 정책 생성
SELECT '=== 5. 새 정책 생성 중... ===' as step;

CREATE POLICY "events_public_read_non_deleted"
ON events
FOR SELECT
TO public
USING (deleted_at IS NULL);

-- 6단계: 새 정책 확인
SELECT '=== 6. 새 정책 확인 ===' as step;
SELECT policyname, cmd, roles::text, qual::text as using_expression
FROM pg_policies 
WHERE tablename = 'events' AND cmd = 'SELECT';

-- 7단계: 최종 테스트 - 해당 이벤트를 다시 조회
SELECT '=== 7. 최종 테스트: 이벤트 다시 조회 ===' as step;
SELECT id, title, deleted_at
FROM events
WHERE id = '0404750f-302c-456b-a5fe-433486610edf';

SELECT '=== 완료! 위 결과를 모두 복사해서 알려주세요 ===' as step;
