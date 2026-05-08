-- RLS를 완전히 비활성화 (가장 간단한 방법)
-- 주의: 모든 사용자가 모든 데이터를 읽을 수 있게 됩니다

ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';
