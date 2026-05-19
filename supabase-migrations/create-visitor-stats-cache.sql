-- 방문자 통계 캐시 테이블
-- 5분마다 업데이트되는 통계 요약

CREATE TABLE IF NOT EXISTS visitor_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- 'summary'
  today INTEGER NOT NULL DEFAULT 0,
  yesterday INTEGER NOT NULL DEFAULT 0,
  last_7_days INTEGER NOT NULL DEFAULT 0,
  last_30_days INTEGER NOT NULL DEFAULT 0,
  last_365_days INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  first_visit_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visitor_stats_cache_key ON visitor_stats_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_cache_updated ON visitor_stats_cache(updated_at);

-- RLS 활성화
ALTER TABLE visitor_stats_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (캐시는 공개 정보)
CREATE POLICY "Anyone can read visitor stats cache"
  ON visitor_stats_cache
  FOR SELECT
  USING (true);

-- 초기 캐시 데이터 삽입
INSERT INTO visitor_stats_cache (cache_key, today, yesterday, last_7_days, last_30_days, last_365_days, total_visits)
VALUES ('summary', 0, 0, 0, 0, 0, 0)
ON CONFLICT (cache_key) DO NOTHING;
