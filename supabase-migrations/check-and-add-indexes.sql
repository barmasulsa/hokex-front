-- 슈퍼베이스 최적화: 인덱스 확인 및 추가
-- 작성일: 2026-05-26
-- 목적: 1,000명 동시 접속 대응 쿼리 최적화

-- 1. 현재 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;

-- 2. 필수 인덱스 추가 (없으면 생성)

-- 2-1. deleted_at + start_date 복합 인덱스 (가장 중요)
-- 이 인덱스는 "deleted_at IS NULL AND ORDER BY start_date" 쿼리를 최적화합니다
CREATE INDEX IF NOT EXISTS idx_events_active_by_date 
ON events(deleted_at, start_date) 
WHERE deleted_at IS NULL;

-- 2-2. start_date 단일 인덱스 (백업용)
CREATE INDEX IF NOT EXISTS idx_events_start_date 
ON events(start_date);

-- 2-3. region 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_events_region 
ON events(region) 
WHERE deleted_at IS NULL;

-- 2-4. venue 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_events_venue 
ON events(venue) 
WHERE deleted_at IS NULL;

-- 2-5. category 필터링용 인덱스 (GIN 인덱스 - 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_events_category_gin 
ON events USING GIN(category);

-- 3. 인덱스 생성 후 다시 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;

-- 4. 쿼리 성능 테스트 (EXPLAIN ANALYZE)
EXPLAIN ANALYZE
SELECT *
FROM events
WHERE deleted_at IS NULL
ORDER BY start_date ASC
LIMIT 48;

-- 5. 예상 결과
-- - idx_events_active_by_date 인덱스가 사용되어야 함
-- - Execution Time이 10ms 이하여야 함
-- - Seq Scan이 아닌 Index Scan이 사용되어야 함
