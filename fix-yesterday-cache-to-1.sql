-- 어제(5월 28일) 캐시를 1명으로 수정
-- 오늘: 2026-05-29
-- 어제: 2026-05-28

-- 1. 먼저 현재 캐시 상태 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 2. visitor_stats 테이블에서 5월 28일 실제 데이터 확인
SELECT 
  visit_date,
  SUM(visit_count) as total_count
FROM visitor_stats
WHERE visit_date = '2026-05-28'
GROUP BY visit_date;

-- 3. visitor_stats 테이블을 1명으로 수정 (만약 다르다면)
-- 먼저 5월 28일 데이터 삭제
DELETE FROM visitor_stats
WHERE visit_date = '2026-05-28';

-- 5월 28일 데이터를 1명으로 삽입
INSERT INTO visitor_stats (visit_date, visit_hour, visit_count, created_at, updated_at)
VALUES 
  ('2026-05-28', 0, 1, NOW(), NOW());

-- 4. 캐시 테이블 업데이트
-- yesterday를 1로 설정
UPDATE visitor_stats_cache
SET 
  yesterday = 1,
  updated_at = NOW()
WHERE cache_key = 'summary';

-- 5. 결과 확인
SELECT 
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- 6. visitor_stats 테이블 최근 3일 확인
SELECT 
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
