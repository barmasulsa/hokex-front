-- 현재 접속 인원 추적 시스템 진단 스크립트

-- 1. online_users 테이블 존재 여부 확인
SELECT 
  table_name, 
  table_schema
FROM information_schema.tables 
WHERE table_name = 'online_users';

-- 2. online_users 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'online_users'
ORDER BY ordinal_position;

-- 3. 현재 저장된 세션 데이터 확인
SELECT 
  session_id,
  last_seen,
  EXTRACT(EPOCH FROM (NOW() - last_seen)) as seconds_ago,
  CASE 
    WHEN last_seen >= NOW() - INTERVAL '30 seconds' THEN '✓ 활성'
    ELSE '✗ 비활성'
  END as status
FROM online_users
ORDER BY last_seen DESC;

-- 4. 현재 활성 세션 수 (30초 이내)
SELECT COUNT(*) as active_sessions
FROM online_users
WHERE last_seen >= NOW() - INTERVAL '30 seconds';

-- 5. RLS (Row Level Security) 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'online_users';

-- 6. 테이블 소유자 및 권한 확인
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'online_users'
ORDER BY grantee, privilege_type;

-- 7. RLS가 활성화되어 있는지 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'online_users';
