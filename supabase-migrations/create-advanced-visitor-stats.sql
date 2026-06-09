-- ============================================
-- Advanced Visitor Stats System
-- Based on: free-visit-counter-api-dashboard
-- ============================================

-- 1. Sites 테이블 (도메인별 방문자 통계)
CREATE TABLE IF NOT EXISTS visitor_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  total_count INTEGER DEFAULT 0,
  today_count INTEGER DEFAULT 0,
  last_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visitor_sites_domain ON visitor_sites(domain);
CREATE INDEX IF NOT EXISTS idx_visitor_sites_last_visit ON visitor_sites(last_visit_date);

-- 2. Visit Log 테이블 (상세 방문 로그)
CREATE TABLE IF NOT EXISTS visitor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES visitor_sites(id) ON DELETE CASCADE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  page_path TEXT DEFAULT '',
  page_title TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  search_query TEXT DEFAULT '',
  visitor_ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_visitor_logs_site_id ON visitor_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_timestamp ON visitor_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_page_path ON visitor_logs(page_path);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_referrer ON visitor_logs(referrer);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_site_timestamp ON visitor_logs(site_id, timestamp DESC);

-- 3. Visitor Deduplication 테이블 (중복 방문 방지)
CREATE TABLE IF NOT EXISTS visitor_dedup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES visitor_sites(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL, -- MD5(IP + User-Agent)
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  ttl_expiry TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '20 minutes')
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_dedup_unique ON visitor_dedup(site_id, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_visitor_dedup_expiry ON visitor_dedup(ttl_expiry);

-- 4. Auto-cleanup expired deduplication records
CREATE OR REPLACE FUNCTION cleanup_expired_visitor_dedup()
RETURNS void AS $$
BEGIN
  DELETE FROM visitor_dedup WHERE ttl_expiry < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS 정책
ALTER TABLE visitor_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_dedup ENABLE ROW LEVEL SECURITY;

-- 모두가 읽기 가능
CREATE POLICY "Anyone can read visitor sites"
  ON visitor_sites FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read visitor logs"
  ON visitor_logs FOR SELECT
  USING (true);

-- Service role만 삽입/업데이트 가능
CREATE POLICY "Service role can manage visitor sites"
  ON visitor_sites
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage visitor logs"
  ON visitor_logs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage visitor dedup"
  ON visitor_dedup
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Helper Functions

-- 도메인 통계 가져오기
CREATE OR REPLACE FUNCTION get_visitor_stats(p_domain TEXT, p_timezone TEXT DEFAULT 'UTC')
RETURNS JSON AS $$
DECLARE
  v_site_id UUID;
  v_total_count INTEGER;
  v_today_count INTEGER;
  v_start_of_day TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
BEGIN
  -- 사이트 찾기
  SELECT id, total_count INTO v_site_id, v_total_count
  FROM visitor_sites
  WHERE domain = p_domain;
  
  IF v_site_id IS NULL THEN
    RETURN json_build_object(
      'totalCount', 0,
      'todayCount', 0,
      'dashboardUrl', 'https://your-domain.com/visitor-stats?domain=' || p_domain
    );
  END IF;
  
  -- 타임존 기반 오늘 시작/종료 시간
  v_start_of_day := (CURRENT_DATE AT TIME ZONE p_timezone) AT TIME ZONE 'UTC';
  v_end_of_day := ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE p_timezone) AT TIME ZONE 'UTC';
  
  -- 오늘 방문자 수
  SELECT COUNT(*) INTO v_today_count
  FROM visitor_logs
  WHERE site_id = v_site_id
    AND timestamp >= v_start_of_day
    AND timestamp < v_end_of_day;
  
  RETURN json_build_object(
    'totalCount', v_total_count,
    'todayCount', v_today_count,
    'dashboardUrl', 'https://your-domain.com/visitor-stats?domain=' || p_domain
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인기 페이지 가져오기
CREATE OR REPLACE FUNCTION get_popular_pages(
  p_site_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  visit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vl.page_path,
    vl.page_title,
    COUNT(*) as visit_count
  FROM visitor_logs vl
  WHERE vl.site_id = p_site_id
    AND (p_start_date IS NULL OR DATE(vl.timestamp) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(vl.timestamp) <= p_end_date)
  GROUP BY vl.page_path, vl.page_title
  ORDER BY visit_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 리퍼러 통계 가져오기
CREATE OR REPLACE FUNCTION get_referrer_stats(
  p_site_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  referrer TEXT,
  visit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vl.referrer,
    COUNT(*) as visit_count
  FROM visitor_logs vl
  WHERE vl.site_id = p_site_id
    AND (p_start_date IS NULL OR DATE(vl.timestamp) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(vl.timestamp) <= p_end_date)
    AND vl.referrer != ''
  GROUP BY vl.referrer
  ORDER BY visit_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 초기 사이트 데이터 (hokex 도메인)
INSERT INTO visitor_sites (domain, total_count, today_count)
VALUES ('hokex.xyz', 0, 0)
ON CONFLICT (domain) DO NOTHING;

-- 8. 기존 visitor_stats 데이터 마이그레이션 (선택사항)
-- 기존 visitor_stats 테이블이 있다면 데이터를 visitor_logs로 마이그레이션할 수 있습니다

COMMENT ON TABLE visitor_sites IS '도메인별 방문자 통계';
COMMENT ON TABLE visitor_logs IS '상세 방문 로그 (페이지, 리퍼러, 검색어)';
COMMENT ON TABLE visitor_dedup IS '중복 방문 방지 (20분 TTL)';
