-- 수동으로 RPC 함수 테스트
-- 오늘 날짜로 방문 기록 추가

SELECT increment_visitor_stat(CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER);

-- 방금 추가된 데이터 확인
SELECT * FROM visitor_stats 
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour DESC;
