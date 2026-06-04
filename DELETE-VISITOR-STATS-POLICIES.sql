-- ============================================
-- 🔧 1단계: 기존 정책 삭제 (정책 충돌 해결)
-- ============================================
-- 실행 방법:
-- 1. 이 파일을 Supabase SQL Editor에 붙여넣기
-- 2. Run 버튼 클릭
-- 3. 다음으로 URGENT-FIX-VISITOR-STATS.sql 실행
-- ============================================

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "allow_read_visitor_stats" ON visitor_stats;
DROP POLICY IF EXISTS "Anyone can read visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can insert visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Service role can update visitor stats" ON visitor_stats;
DROP POLICY IF EXISTS "Allow service role all" ON visitor_stats;
DROP POLICY IF EXISTS "allow_service_role_insert" ON visitor_stats;
DROP POLICY IF EXISTS "allow_service_role_update" ON visitor_stats;

-- 완료 메시지
SELECT 
  '✅ 기존 정책 삭제 완료' as "상태",
  '이제 URGENT-FIX-VISITOR-STATS.sql을 실행하세요' as "다음 단계";
