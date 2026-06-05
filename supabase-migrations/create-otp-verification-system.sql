-- ============================================
-- OTP 코드 인증 시스템 테이블 생성
-- (Magic Link 대체용 - 스팸 필터 회피)
-- ============================================

-- 1. OTP 인증 코드 테이블
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL,
  ip_address TEXT,
  attempts INTEGER DEFAULT 0
);

-- 2. 인덱스 생성 (성능 및 빠른 검색)
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.email_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code ON public.email_verification_codes(email, code);

-- 3. RLS 정책 설정

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Service role이 코드 생성 가능 (Edge Function용)
CREATE POLICY "Service role can insert verification codes"
  ON public.email_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Service role이 코드 조회 및 업데이트 가능
CREATE POLICY "Service role can update verification codes"
  ON public.email_verification_codes
  FOR UPDATE
  USING (true);

-- Service role이 코드 조회 가능
CREATE POLICY "Service role can read verification codes"
  ON public.email_verification_codes
  FOR SELECT
  USING (true);

-- 4. 자동 정리 함수 (만료된 코드 삭제 - 하루 이상 지난 것)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$;

-- 5. 코멘트 추가
COMMENT ON TABLE public.email_verification_codes IS 'OTP 이메일 인증 코드 저장 (Magic Link 대체용)';

COMMENT ON COLUMN public.email_verification_codes.email IS '인증 요청한 이메일 주소';
COMMENT ON COLUMN public.email_verification_codes.code IS '6자리 OTP 코드';
COMMENT ON COLUMN public.email_verification_codes.expires_at IS '코드 만료 시간 (생성 시각 + 5분)';
COMMENT ON COLUMN public.email_verification_codes.used_at IS '코드 사용 시각 (NULL이면 미사용)';
COMMENT ON COLUMN public.email_verification_codes.ip_address IS '요청한 IP 주소 (보안용)';
COMMENT ON COLUMN public.email_verification_codes.attempts IS '검증 시도 횟수 (무차별 대입 방지)';

