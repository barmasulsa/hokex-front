-- 배너/공지 시스템 테이블 생성
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('image', 'youtube', 'text')),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- 이미지 URL, YouTube ID, 또는 텍스트 내용
  link_url TEXT, -- 이미지 배너 클릭 시 이동할 URL (선택)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0, -- 표시 순서
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 배너 조회 가능
CREATE POLICY "Anyone can view active banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- 관리자만 배너 관리 가능
CREATE POLICY "Admins can manage banners"
  ON public.banners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성
CREATE INDEX idx_banners_active_order ON public.banners(is_active, display_order);

-- 샘플 데이터 (선택)
INSERT INTO public.banners (type, title, content, is_active, display_order) VALUES
  ('text', '환영 메시지', '🎉 HOKEX에 오신 것을 환영합니다! 전국 전시회 정보를 한눈에 확인하세요.', true, 1);
