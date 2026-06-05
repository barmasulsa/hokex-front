-- ==========================================
-- 🔍 RPC 함수 존재 확인
-- ==========================================
-- 이 쿼리는 방문자 추적에 필요한 RPC 함수가 있는지 확인합니다

-- ✅ Step 1: increment_visitor_count 함수 확인
SELECT 
  '✅ RPC 함수 존재 확인' as 체크항목,
  proname as 함수명,
  pg_get_function_identity_arguments(p.oid) as 파라미터,
  prorettype::regtype as 리턴타입,
  prosrc as 함수코드_일부
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN ('increment_visitor_count', 'increment_visitor_stat', 'get_visitor_stats');

-- 📝 결과 해석:
-- - 0 rows 반환 → ❌ 함수가 없습니다! 함수를 생성해야 합니다
-- - 1개 이상 반환 → ✅ 함수가 있습니다. 다음 단계로 진행하세요

-- ==========================================
-- 다음 단계 안내:
-- ==========================================
-- 
-- 🔴 만약 위에서 0 rows가 나왔다면:
--    → "함수 없음" 이라고 알려주세요
--    → 함수를 다시 생성하겠습니다
--
-- 🟢 만약 함수명이 나왔다면:
--    → "함수 있음: [함수명]" 이라고 알려주세요
--    → 함수명을 정확히 알려주시면 프론트엔드 코드를 확인하겠습니다
--
-- ==========================================
