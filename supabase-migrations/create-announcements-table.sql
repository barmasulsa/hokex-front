-- announcements 테이블 생성
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal', 'important', 'update')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_announcements_active_dates 
ON announcements(is_active, start_date, end_date)
WHERE is_active = true;

-- RLS 활성화
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 알림 조회 가능
CREATE POLICY "Anyone can view active announcements"
ON announcements FOR SELECT
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- 관리자만 알림 생성/수정/삭제 가능
-- admin_users 테이블이 있다고 가정
CREATE POLICY "Only admins can manage announcements"
ON announcements FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email IN (
      'lcw5506@naver.com',
      'admin@hokex.kr'
    )
  )
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_announcements_updated_at();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✓ announcements 테이블이 생성되었습니다.';
  RAISE NOTICE '✓ RLS 정책이 설정되었습니다.';
  RAISE NOTICE '✓ 인덱스가 생성되었습니다.';
END $$;
