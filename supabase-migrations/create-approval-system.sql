-- ============================================
-- 관리자 수동 승인 시스템 테이블 생성
-- ============================================

-- 1. 승인된 이메일 목록 테이블
CREATE TABLE IF NOT EXISTS public.approved_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 대기 중인 승인 요청 테이블
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL, -- 'EMAIL_BLOCKED', 'SPAM_FILTER', 'RATE_LIMIT' 등
  error_message TEXT,
  request_count INTEGER DEFAULT 1,
  first_requested_at TIMESTAMPTZ DEFAULT NOW(),
  last_requested_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS 정책 설정 (관리자만 읽기/쓰기 가능)

-- approved_emails 테이블
ALTER TABLE public.approved_emails ENABLE ROW LEVEL SECURITY;

-- 관리자만 읽기
CREATE POLICY "Admins can read approved emails"
  ON public.approved_emails
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 관리자만 추가
CREATE POLICY "Admins can insert approved emails"
  ON public.approved_emails
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 관리자만 삭제
CREATE POLICY "Admins can delete approved emails"
  ON public.approved_emails
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- pending_approvals 테이블
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- 관리자만 읽기
CREATE POLICY "Admins can read pending approvals"
  ON public.pending_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 시스템이 자동으로 추가할 수 있도록 (service_role 키 사용)
CREATE POLICY "Service role can insert pending approvals"
  ON public.pending_approvals
  FOR INSERT
  WITH CHECK (true);

-- 시스템이 자동으로 업데이트할 수 있도록
CREATE POLICY "Service role can update pending approvals"
  ON public.pending_approvals
  FOR UPDATE
  USING (true);

-- 관리자만 삭제
CREATE POLICY "Admins can delete pending approvals"
  ON public.pending_approvals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 4. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_approved_emails_email ON public.approved_emails(email);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_email ON public.pending_approvals(email);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_last_requested ON public.pending_approvals(last_requested_at DESC);

-- 5. 코멘트 추가
COMMENT ON TABLE public.approved_emails IS '관리자가 수동으로 승인한 이메일 목록';
COMMENT ON TABLE public.pending_approvals IS '스팸 차단 등으로 로그인 실패한 사용자의 승인 대기 목록';

COMMENT ON COLUMN public.approved_emails.email IS '승인된 이메일 주소';
COMMENT ON COLUMN public.approved_emails.approved_by IS '승인한 관리자의 user_id';
COMMENT ON COLUMN public.approved_emails.notes IS '승인 시 관리자가 남긴 메모';

COMMENT ON COLUMN public.pending_approvals.email IS '승인 대기 중인 이메일 주소';
COMMENT ON COLUMN public.pending_approvals.reason IS '대기 명단에 추가된 이유 (EMAIL_BLOCKED, SPAM_FILTER 등)';
COMMENT ON COLUMN public.pending_approvals.error_message IS '발생한 에러 메시지';
COMMENT ON COLUMN public.pending_approvals.request_count IS '로그인 시도 횟수';
COMMENT ON COLUMN public.pending_approvals.first_requested_at IS '첫 시도 일시';
COMMENT ON COLUMN public.pending_approvals.last_requested_at IS '마지막 시도 일시';
