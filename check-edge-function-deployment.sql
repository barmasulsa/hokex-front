-- =====================================================
-- Edge Function 배포 상태 확인
-- =====================================================

-- 1. Supabase Dashboard에서 확인
-- Edge Functions → track-visit 함수가 배포되어 있는지 확인

-- 2. 함수가 없다면 배포 필요
-- 아래 경로의 코드를 Supabase Edge Function으로 배포:
-- supabase/functions/track-visit/index.ts

-- 3. 테스트 방법 (브라우저 콘솔에서 실행)
/*
fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/track-visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ domain: 'hokex.xyz' })
})
.then(res => res.json())
.then(data => console.log('Track visit result:', data))
.catch(err => console.error('Track visit error:', err));
*/

-- =====================================================
-- 임시 해결책: 수동으로 테스트 데이터 추가
-- =====================================================

-- visitor_sites는 이미 존재하므로 스킵

-- 테스트용 visitor_dedup 레코드 추가
INSERT INTO visitor_dedup (site_id, visitor_hash, last_visit, ttl_expiry)
SELECT 
  id,
  'test_visitor_' || generate_series(1, 5)::text,
  NOW() - (random() * INTERVAL '2 hours'),
  NOW() + INTERVAL '20 minutes'
FROM visitor_sites
WHERE domain = 'hokex.xyz';

-- 테스트용 visitor_logs 레코드 추가
INSERT INTO visitor_logs (site_id, page_path, visitor_ip, created_at)
SELECT 
  id,
  '/',
  '127.0.0.' || generate_series(1, 10)::text,
  NOW() - (random() * INTERVAL '5 hours')
FROM visitor_sites
WHERE domain = 'hokex.xyz';

-- 결과 확인
SELECT 
  'visitor_sites' as table_name,
  COUNT(*) as total_records,
  array_agg(domain) as domains
FROM visitor_sites
UNION ALL
SELECT 
  'visitor_dedup' as table_name,
  COUNT(*) as total_records,
  ARRAY['unique_visitors: ' || COUNT(DISTINCT visitor_hash)::TEXT]
FROM visitor_dedup
UNION ALL
SELECT 
  'visitor_logs' as table_name,
  COUNT(*) as total_records,
  ARRAY['total_logs: ' || COUNT(*)::TEXT]
FROM visitor_logs;

-- 통계 함수 테스트
SELECT get_visitor_statistics('hokex.xyz');

-- =====================================================
-- 다음 단계
-- =====================================================
-- 1. 위 SQL 실행 후 관리자 페이지 확인
-- 2. 통계가 표시되면 Edge Function 배포 필요
-- 3. Edge Function 배포 후 테스트 데이터 삭제:
--    DELETE FROM visitor_dedup WHERE visitor_hash LIKE 'test_visitor_%';
--    DELETE FROM visitor_logs WHERE visitor_ip LIKE '127.0.0.%';
