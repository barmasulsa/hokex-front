-- Stibee 구독자 정보를 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS stibee_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이메일 인덱스 (빠른 조회)
CREATE INDEX IF NOT EXISTS idx_stibee_subscribers_email ON stibee_subscribers(email);

-- RLS 정책 설정
ALTER TABLE stibee_subscribers ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (로그인 체크용)
CREATE POLICY "Anyone can read stibee_subscribers"
  ON stibee_subscribers
  FOR SELECT
  USING (true);

-- Service Role만 쓰기 가능 (동기화용)
CREATE POLICY "Service role can manage stibee_subscribers"
  ON stibee_subscribers
  FOR ALL
  USING (auth.role() = 'service_role');

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_stibee_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stibee_subscribers_updated_at
  BEFORE UPDATE ON stibee_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_stibee_subscribers_updated_at();
