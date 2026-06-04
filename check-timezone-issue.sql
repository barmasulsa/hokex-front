-- 시간대 문제 진단
-- 현재 시간: 2026년 6월 2일 낮 12시 (KST)

-- 1. 현재 DB 서버 시간 확인
SELECT 
  '=== DB 서버 시간 ===' as info,
  NOW() as "DB 현재시간(UTC)",
  NOW() AT TIME ZONE 'Asia/Seoul' as "DB 현재시간(KST)",
  CURRENT_DATE as "DB 현재날짜";

-- 2. 오늘 방문 기록 확인 (시간대별)
SELECT 
  '=== 오늘 방문 기록 ===' as info,
  visit_date as "방문날짜",
  visit_hour as "방문시간",
  visit_count as "방문수",
  created_at as "생성시각(UTC)",
  created_at AT TIME ZONE 'Asia/Seoul' as "생성시각(KST)"
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 3. 최근 기록 확인 (생성 시각 기준)
SELECT 
  '=== 최근 생성된 기록 ===' as info,
  visit_date as "방문날짜",
  visit_hour as "방문시간",
  visit_count as "방문수",
  created_at as "생성시각(UTC)",
  created_at AT TIME ZONE 'Asia/Seoul' as "생성시각(KST)",
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') as "실제생성시각(KST시간)"
FROM visitor_stats
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 4. 문제 진단
SELECT 
  '=== 문제 진단 ===' as info,
  visit_hour as "저장된시간",
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') as "실제생성시각(KST)",
  CASE 
    WHEN visit_hour = EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') THEN '✅ 정상 (KST 저장)'
    WHEN visit_hour = EXTRACT(HOUR FROM created_at) THEN '❌ UTC로 저장됨'
    ELSE '⚠️ 알 수 없음'
  END as "저장방식",
  created_at AT TIME ZONE 'Asia/Seoul' as "생성시각(KST)"
FROM visitor_stats
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
