-- 오늘 날짜(KST)의 모든 방문 레코드 확인
SELECT 
  id,
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
WHERE visit_date = (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date
ORDER BY visit_hour;
