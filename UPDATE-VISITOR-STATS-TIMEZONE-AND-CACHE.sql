-- ============================================
-- 🔧 방문자 통계 시간대 수정 (UTC → KST)
-- ============================================
-- 실행 방법:
-- 1. 이 파일을 Supabase SQL Editor에 붙여넣기
-- 2. Run 버튼 클릭
-- 3. 프론트엔드 다시 배포 (src/utils/detailedAnalytics.ts 변경됨)
-- 4. Edge Function Cron Schedule 변경 (Supabase Dashboard)
-- ============================================

-- 아무것도 실행할 필요 없음 (DB는 UTC 시간 그대로 저장)
-- 프론트엔드에서 KST로 변환하여 DB에 저장하도록 수정됨

SELECT 
  '=== 📌 다음 단계 ===' as "━━━━━━━━━━━━━━━━━━━━━"
UNION ALL
SELECT 
  '✅ 1단계: 프론트엔드 코드 수정 완료'
UNION ALL
SELECT 
  '   → src/utils/detailedAnalytics.ts에서 KST 변환 적용'
UNION ALL
SELECT 
  ''
UNION ALL
SELECT 
  '🔧 2단계: Supabase Edge Function Cron Schedule 변경'
UNION ALL
SELECT 
  '   1. Supabase Dashboard → Edge Functions 메뉴'
UNION ALL
SELECT 
  '   2. update-visitor-stats-cache 함수 선택'
UNION ALL
SELECT 
  '   3. Cron Schedules 탭'
UNION ALL
SELECT 
  '   4. 기존 "*/5 * * * *" (5분마다) 삭제'
UNION ALL
SELECT 
  '   5. 새로운 스케줄 추가: "*/30 * * * *" (30분마다)'
UNION ALL
SELECT 
  ''
UNION ALL
SELECT 
  '📱 3단계: 프론트엔드 재배포'
UNION ALL
SELECT 
  '   git add .'
UNION ALL
SELECT 
  '   git commit -m "fix: 방문자 통계 시간대 KST 적용, 캐시 30분 주기"'
UNION ALL
SELECT 
  '   git push'
UNION ALL
SELECT 
  ''
UNION ALL
SELECT 
  '✅ 4단계: 테스트'
UNION ALL
SELECT 
  '   1. localStorage.removeItem("last_visit_date")'
UNION ALL
SELECT 
  '   2. 페이지 새로고침'
UNION ALL
SELECT 
  '   3. F12 콘솔에서 시간 확인 (한국 시간으로 기록됨)'
UNION ALL
SELECT 
  '   4. 30분 후 캐시 업데이트 확인';

-- ============================================
-- 🔧 Edge Function Cron Schedule 수동 변경 필요
-- ============================================
-- 
-- Supabase에서 Cron Schedule을 변경하는 것은
-- SQL로는 불가능하며, 반드시 Dashboard에서 수동으로 변경해야 합니다.
--
-- 변경 전: */5 * * * *  (5분마다)
-- 변경 후: */30 * * * * (30분마다)
--
-- ============================================

