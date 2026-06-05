# 🚨 500 에러 해결 가이드: Resend API 설정

## 📌 문제 상황

test-otp-local.html에서 OTP 발송 시 **500 Internal Server Error** 발생

```
Failed to load resource: the server responded with a status of 500 ()
OTP Error: Error: Failed to send OTP email
```

---

## 🔍 원인

Edge Function에서 **`RESEND_API_KEY` 환경 변수가 설정되지 않음**

Edge Function 코드:
```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not configured');
  throw new Error('Email service not configured');
}
```

---

## ✅ 해결 방법 (3단계)

### 1단계: Resend API Key 발급

이미 발급받았다면 **2단계**로 건너뛰세요.

**아직 없다면:**

1. https://resend.com/login 접속 (또는 회원가입)
2. 왼쪽 메뉴 **"API Keys"** 클릭
3. **"Create API Key"** 버튼 클릭
4. Name 입력: `HOKEX_OTP`
5. Permission: **"Full access"** 또는 **"Sending access"**
6. **Create** 클릭
7. **API Key 복사** (형식: `re_xxxxxxxxxxxxxxxxxxxxx`)
   - ⚠️ 한 번만 표시되므로 안전한 곳에 저장!

---

### 2단계: Supabase Dashboard에서 환경 변수 설정 ⭐ 중요!

**Supabase Dashboard에서 설정:**

1. https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig 접속
2. 왼쪽 메뉴 **"Settings"** (⚙️) 클릭
3. **"Edge Functions"** 메뉴 클릭
4. **"Secrets"** 또는 **"Environment Variables"** 탭 선택
5. **"Add new secret"** 또는 **"New variable"** 버튼 클릭

**추가할 값:**
```
Name:  RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxxx  (발급받은 실제 키)
```

6. **"Add secret"** 또는 **"Save"** 클릭

**✅ 확인:**
- `RESEND_API_KEY`가 목록에 표시되면 성공!
- Value는 `re_****` 형태로 마스킹되어 보임

---

### 3단계: Edge Function 재배포 🚀

**환경 변수를 추가/변경한 후에는 반드시 재배포가 필요합니다!**

#### 방법 1: Dashboard에서 재배포 (가장 간단)

1. 왼쪽 메뉴 **"Edge Functions"** 클릭
2. **"send-otp-code"** 함수 클릭
3. 우측 상단 **"Deploy"** 또는 **"Redeploy"** 버튼 클릭
4. 배포 완료 대기 (녹색 체크마크 확인)

#### 방법 2: CLI로 재배포

PowerShell에서 실행:
```powershell
cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"
supabase functions deploy send-otp-code --no-verify-jwt
```

**또는 스크립트 실행:**
```powershell
.\redeploy-otp-function.ps1
```

---

## 🧪 배포 후 테스트

### 1. Dashboard에서 직접 테스트

1. **Edge Functions** → **send-otp-code** → **"Invoke"** 탭
2. Request Body에 입력:
```json
{
  "email": "your-email@gmail.com"
}
```
3. **"Run"** 또는 **"Send"** 버튼 클릭

**기대 응답:**
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

### 2. test-otp-local.html에서 테스트

1. `test-otp-local.html` 파일 열기
2. Project Ref 입력: `qmhxnxnaawtjelqlgyig`
3. Anon Key 입력 (Dashboard → Settings → API → anon key 복사)
4. 이메일 입력
5. **"인증 코드 발송"** 버튼 클릭

**기대 결과:**
```
✅ 성공!
OTP 코드가 발송되었습니다.
만료 시간: 300초
```

### 3. 이메일 확인

- **받은편지함** 또는 **스팸함** 확인
- 발신자: `HOKEX <onboarding@resend.dev>`
- 제목: `[HOKEX] 로그인 인증 코드: 123456`

### 4. DB에서 확인

Supabase Dashboard → **SQL Editor**:
```sql
SELECT 
  email,
  code,
  expires_at,
  created_at,
  used_at
FROM email_verification_codes
ORDER BY created_at DESC
LIMIT 5;
```

OTP 코드가 저장되었는지 확인!

---

## 🐛 여전히 500 에러가 나는 경우

### 1. Edge Function Logs 확인

**Dashboard → Edge Functions → send-otp-code → Logs 탭**

**자주 나오는 에러:**

#### ❌ "RESEND_API_KEY not configured"
→ 환경 변수 설정 안 됨 (2단계 다시 확인)
→ 재배포 안 됨 (3단계 실행)

#### ❌ "Failed to generate OTP code"
→ DB 테이블이 없음

**해결:**
```sql
-- SQL Editor에서 실행
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  ip_address text,
  CONSTRAINT unique_unused_code UNIQUE (email, code)
);

-- RLS 정책 추가
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for service role only"
  ON email_verification_codes FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "Enable select for service role only"
  ON email_verification_codes FOR SELECT
  TO service_role USING (true);

CREATE POLICY "Enable delete for service role only"
  ON email_verification_codes FOR DELETE
  TO service_role USING (true);
```

#### ❌ "Email send failed: Invalid API key"
→ Resend API Key가 잘못됨

**해결:**
1. Resend Dashboard에서 새 API Key 재발급
2. Supabase에서 `RESEND_API_KEY` 값 업데이트
3. Edge Function 재배포

#### ❌ "Domain not verified"
→ `from: 'HOKEX <noreply@hokex.kr>'` 사용 중이지만 도메인 미인증

**해결 (테스트용):**

Edge Function 코드 수정 (119번째 줄):
```typescript
from: 'HOKEX <onboarding@resend.dev>',  // 테스트용 발신자
```

재배포 후 테스트

---

## 📊 최종 체크리스트

- [ ] Resend API Key 발급 완료
- [ ] Supabase Dashboard에서 `RESEND_API_KEY` 환경 변수 설정
- [ ] Edge Function 재배포 (Dashboard 또는 CLI)
- [ ] Dashboard의 Invoke 탭에서 테스트 성공
- [ ] test-otp-local.html에서 테스트 성공
- [ ] 실제 이메일 수신 확인
- [ ] DB에 OTP 코드 저장 확인
- [ ] Logs에서 에러 없음 확인

---

## 🎯 빠른 해결 순서

```
1. Resend API Key 복사
   ↓
2. Supabase Dashboard → Settings → Edge Functions → Secrets
   → RESEND_API_KEY 추가
   ↓
3. Edge Functions → send-otp-code → Deploy 버튼 클릭
   ↓
4. test-otp-local.html에서 테스트
   ↓
5. ✅ 이메일 수신 확인!
```

---

## 💡 추가 팁

### Resend 무료 플랜 제한
- 월 3,000통 무료
- `onboarding@resend.dev`만 발신자로 사용 가능
- 커스텀 도메인은 유료 플랜 필요 (월 $20)

### 프로덕션 배포 전
1. 커스텀 도메인 인증 (`hokex.kr`)
2. SPF, DKIM 설정 완료
3. 발신자를 `noreply@hokex.kr`로 변경

---

## 🆘 여전히 안 될 경우

**Edge Function Logs 전체 내용을 복사해서 보내주세요:**
1. Dashboard → Edge Functions → send-otp-code → Logs
2. 최근 10개 로그 복사
3. 스크린샷 또는 텍스트로 공유

**확인할 정보:**
- Resend API Key 형태: `re_`로 시작하나요?
- 환경 변수가 Edge Functions 설정에 보이나요?
- 재배포 후에도 같은 에러인가요?
- DB 테이블 `email_verification_codes`가 존재하나요?
