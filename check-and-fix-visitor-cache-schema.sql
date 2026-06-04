-- 방문자 통계 캐시 테이블 스키마 확인 및 수정
-- 문제: last_365_days, total_visits 컬럼이 없을 수 있음

-- ========================================
-- 1단계: 현재 테이블 스키마 확인
-- ========================================
SELECT 
  '현재 visitor_stats_cache 컬럼 목록' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'visitor_stats_cache'
ORDER BY ordinal_position;

-- ========================================
-- 2단계: 누락된 컬럼 추가 (있으면 무시)
-- ========================================

-- last_365_days 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitor_stats_cache' 
    AND column_name = 'last_365_days'
  ) THEN
    ALTER TABLE visitor_stats_cache 
    ADD COLUMN last_365_days INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE '✅ last_365_days 컬럼 추가됨';
  ELSE
    RAISE NOTICE '✓ last_365_days 컬럼 이미 존재';
  END IF;
END $$;

-- total_visits 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitor_stats_cache' 
    AND column_name = 'total_visits'
  ) THEN
    ALTER TABLE visitor_stats_cache 
    ADD COLUMN total_visits INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE '✅ total_visits 컬럼 추가됨';
  ELSE
    RAISE NOTICE '✓ total_visits 컬럼 이미 존재';
  END IF;
END $$;

-- first_visit_date 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitor_stats_cache' 
    AND column_name = 'first_visit_date'
  ) THEN
    ALTER TABLE visitor_stats_cache 
    ADD COLUMN first_visit_date DATE;
    RAISE NOTICE '✅ first_visit_date 컬럼 추가됨';
  ELSE
    RAISE NOTICE '✓ first_visit_date 컬럼 이미 존재';
  END IF;
END $$;

-- ========================================
-- 3단계: 수정된 스키마 확인
-- ========================================
SELECT 
  '수정 후 visitor_stats_cache 컬럼 목록' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'visitor_stats_cache'
ORDER BY ordinal_position;

-- ========================================
-- 4단계: 캐시 데이터 확인 (모든 컬럼)
-- ========================================
SELECT 
  '캐시 데이터 (전체 컬럼)' as info,
  cache_key,
  today,
  yesterday,
  last_7_days,
  last_30_days,
  last_365_days,
  total_visits,
  first_visit_date,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM visitor_stats_cache
WHERE cache_key = 'summary';

-- ========================================
-- 완료
-- ========================================
SELECT 
  '✅ 스키마 확인 및 수정 완료' as status,
  NOW() as completed_at;
