# 🚀 OTP Edge Function 재배포 가이드

## 📌 변경 사항
- 발신자 이메일을 `noreply@hokex.kr` → `onboarding@resend.dev`로 변경
- Resend 도메인 인증 없이도 테스트 가능

---

## 🔧 1단계: Edge Function 재배포

PowerShell을 열고 프로젝트 디렉토리로 이동:

```powershell
cd "C:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"
```

Edge Function 배포:

```powershell
supabase functions deploy send-otp-code --no-verify-jwt
```

---

## 🔧 2단계: 환경 변수 확인

Supabase Dashboard에서:

1. **Edge Functions** → **send-otp-code** → **Settings** → **Secrets**
2. `RESEND_API_KEY` 확인 (re_로 시작)

**만약 없다면 추가:**

```powershell
supabase secrets set RESEND_API_KEY=re_your_actual_key_here
```

---

## 🔧 3단계: 테이블 확인

Supabase Dashboard → **SQL Editor**에서 실행:

```sql
-- 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'email_verification_codes'
);
```

**결과가 false라면 테이블 생성:**

```sql
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_email_verification_codes_email ON email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);

-- RLS 활성화
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Service Role이 모든 작업 가능하도록 정책 추가
CREATE POLICY "Service role can manage email_verification_codes"
  ON email_verification_codes
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 🧪 4단계: 테스트

1. `test-otp-local.html` 파일을 브라우저에서 열기
2. 다음 정보 입력:
   - Email: 실제 이메일 주소
   - Project Ref: Supabase 프로젝트 ID (영문+숫자만)
   - Anon Key: Dashboard → Settings → API에서 복사
3. "인증 코드 발송" 버튼 클릭

---

## 🔍 5단계: 로그 확인

**에러가 발생하면:**

Supabase Dashboard → **Edge Functions** → **send-otp-code** → **Logs**

**일반적인 에러:**

### ❌ "RESEND_API_KEY not configured"
→ Step 2에서 환경 변수 추가

### ❌ "relation email_verification_codes does not exist"
→ Step 3에서 테이블 생성

### ❌ "Domain not verified" 또는 "Invalid from address"
→ 이미 수정됨 (onboarding@resend.dev 사용)

### ❌ "Invalid API key" 또는 "Unauthorized"
→ Resend API 키가 잘못됨. https://resend.com/api-keys 에서 재발급

---

## ✅ 성공 확인

성공하면 다음이 표시됩니다:

```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

**이메일이 도착하지 않았다면:**
- Supabase Dashboard → **Table Editor** → `email_verification_codes`
- 해당 이메일로 검색하여 `code` 컬럼에서 6자리 OTP 확인

---

## 🎯 다음 단계

OTP 발송이 성공하면:

1. **도메인 인증 (선택):**
   - https://resend.com/domains 에서 `hokex.kr` 도메인 추가
   - DNS 레코드 설정
   - 인증 완료 후 `onboarding@resend.dev` → `noreply@hokex.kr` 변경

2. **프론트엔드 통합:**
   - LoginPage.tsx에서 OTP 입력 UI 추가
   - 인증 로직 구현

---

## 📞 문제 발생 시

에러 메시지와 함께 다음 정보를 공유해주세요:

1. Edge Function 로그 (최근 에러)
2. 브라우저 콘솔 에러
3. test-otp-local.html 실행 결과

