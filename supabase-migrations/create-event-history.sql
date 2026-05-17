-- 행사 변경 이력 테이블 생성
CREATE TABLE IF NOT EXISTS public.event_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- 변경된 필드명 (title, poster_url, start_date, end_date, venue_event_page_url, website_url 등)
  old_value TEXT, -- 이전 값
  new_value TEXT, -- 새로운 값
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON public.event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_history_user_id ON public.event_history(user_id);
CREATE INDEX IF NOT EXISTS idx_event_history_changed_at ON public.event_history(changed_at DESC);

-- RLS 정책 활성화
ALTER TABLE public.event_history ENABLE ROW LEVEL SECURITY;

-- 관리자만 변경 이력을 볼 수 있음
CREATE POLICY "Admins can view event history"
  ON public.event_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 관리자만 변경 이력을 생성할 수 있음
CREATE POLICY "Admins can create event history"
  ON public.event_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 코멘트 추가
COMMENT ON TABLE public.event_history IS '행사 정보 변경 이력을 추적하는 테이블';
COMMENT ON COLUMN public.event_history.field_name IS '변경된 필드명 (title, poster_url, start_date, end_date, venue_event_page_url, website_url 등)';
COMMENT ON COLUMN public.event_history.old_value IS '변경 전 값';
COMMENT ON COLUMN public.event_history.new_value IS '변경 후 값';
