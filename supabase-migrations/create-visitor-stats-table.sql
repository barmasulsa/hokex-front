-- 방문자 통계 테이블 생성
CREATE TABLE IF NOT EXISTS visitor_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL,
  visit_hour INTEGER NOT NULL CHECK (visit_hour >= 0 AND visit_hour <= 23),
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(visit_date, visit_hour)
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date ON visitor_stats(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date_hour ON visitor_stats(visit_date, visit_hour);

-- RLS 활성화
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (통계 조회)
CREATE POLICY "Anyone can read visitor stats"
  ON visitor_stats
  FOR SELECT
  USING (true);

-- 인증된 사용자만 삽입/업데이트 가능
CREATE POLICY "Authenticated users can insert visitor stats"
  ON visitor_stats
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update visitor stats"
  ON visitor_stats
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 자동 updated_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_visitor_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visitor_stats_updated_at_trigger
  BEFORE UPDATE ON visitor_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_stats_updated_at();

-- 코멘트 추가
COMMENT ON TABLE visitor_stats IS '방문자 통계 (날짜별, 시간대별)';
COMMENT ON COLUMN visitor_stats.visit_date IS '방문 날짜 (YYYY-MM-DD)';
COMMENT ON COLUMN visitor_stats.visit_hour IS '방문 시간 (0-23)';
COMMENT ON COLUMN visitor_stats.visit_count IS '해당 날짜/시간의 방문 수';
