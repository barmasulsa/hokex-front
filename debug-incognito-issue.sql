-- 시크릿 모드 방문 추적 문제 디버깅
-- 실행 시간: 2026-05-27

-- 1. 오늘 모든 시간대 방문 기록 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 2. 최근 10분 내 생성/업데이트된 기록 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at,
  CASE 
    WHEN created_at >= NOW() - INTERVAL '10 minutes' THEN '✅ 새로 생성됨'
    WHEN updated_at >= NOW() - INTERVAL '10 minutes' THEN '🔄 업데이트됨'
    ELSE '⏰ 이전 기록'
  END as status
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY updated_at DESC;

-- 3. RLS 정책 확인 (익명 사용자 INSERT 권한)
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
WHERE tablename = 'visitor_stats';

-- 4. 현재 서버 시간 확인
SELECT 
  NOW() as server_time,
  CURRENT_DATE as server_date,
  EXTRACT(HOUR FROM NOW()) as server_hour;
