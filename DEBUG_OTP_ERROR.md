# OTP 에러 디버깅 가이드

## 🔴 발생한 에러
```
Failed to send OTP email
xhr.js:m Error: Failed to load resource: the server responded with a status of 500
```

## 🔍 원인 분석

### 가능한 원인 3가지:

1. **RESEND_API_KEY가 Edge Function에 설정되지 않음**
2. **Resend API 요청 실패** (API 키 유효하지 않음)
3. **Supabase Service Role Key 문제**

---

## ✅ 해결 단계

### Step 1: Edge Function 환경 변수 확인

```bash
# Supabase Dashboard
Settings → Edge Functions → Secrets

필수 환경 변수:
- RESEND_API_KEY: re_xxxxxxxxxxxxx
- SUPABASE_URL: https://qmhxnxnaawtjelqlgyig.supabase.co
- SUPABASE_SERVICE_ROLE_KEY: eyJhbGc...
```

**확인 방법:**
1. Supabase Dashboard 로그인
2. Settings → Edge Functions
3. "Manage secrets" 클릭
4. 위 3개 변수가 모두 설정되어 있는지 확인

---

### Step 2: Edge Function 재배포

환경 변수를 설정한 후 Edge Function을 다시 배포하세요:

```bash
cd hokex-front
supabase functions deploy send-otp-code
```

---

### Step 3: Edge Function 로그 확인

```bash
# Supabase Dashboard
Edge Functions → send-otp-code → Logs (실시간)
```

또는 CLI로 확인:

```bash
supabase functions logs send-otp-code
```

**찾아야 할 로그:**
- `"Error sending OTP email"` → Resend API 문제
- `"RESEND_API_KEY not configured"` → 환경 변수 미설정
- `"Error inserting OTP code"` → DB 권한 문제

---

### Step 4: Resend API 키 확인

Resend Dashboard에서 API 키가 유효한지 확인:

1. https://resend.com/api-keys
2. 현재 API 키가 활성화되어 있는지 확인
3. 필요시 새 API 키 생성

**테스트 명령어:**
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": ["test@example.com"],
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

---

## 🔧 임시 해결: DB에서 직접 OTP 확인

Edge Function이 작동하지 않을 경우, 수동으로 OTP를 생성하고 테스트할 수 있습니다:

### 1. Supabase SQL Editor에서 실행:

```sql
-- 1. 테스트용 OTP 코드 생성
INSERT INTO email_verification_codes (email, code, expires_at)
VALUES (
  'test@example.com',
  '123456',
  NOW() + INTERVAL '5 minutes'
);

-- 2. 생성된 코드 확인
SELECT * FROM email_verification_codes 
WHERE email = 'test@example.com' 
  AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
```

### 2. 로그인 페이지에서 테스트:

- 이메일: `test@example.com`
- OTP: `123456`

---

## 🚨 가장 가능성 높은 원인

스크린샷을 보니 **"Failed to send OTP email"** 메시지가 명확히 보입니다.

**가장 가능성 높은 원인:**
1. ❌ **RESEND_API_KEY가 Edge Function 환경 변수에 없음**
2. ❌ **Resend API 키가 잘못됨**

**해결책:**
```bash
# 1. Supabase Dashboard에서 확인
Settings → Edge Functions → Manage secrets

# 2. RESEND_API_KEY 추가 (없다면)
Name: RESEND_API_KEY
Value: re_xxxxxxxxxxxxx (Resend Dashboard에서 복사)

# 3. Edge Function 재배포
supabase functions deploy send-otp-code
```

---

## 📊 Edge Function 상태 확인

```bash
# CLI로 Edge Function 상태 확인
supabase functions list

# 특정 함수 로그 확인
supabase functions logs send-otp-code --tail

# Edge Function 테스트 호출
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/send-otp-code \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## ✅ 성공 시 예상 로그

```
INFO: OTP email sent to test@example.com
INFO: {
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

---

## 🔄 다음 단계

1. ✅ Edge Function 환경 변수 설정
2. ✅ Edge Function 재배포
3. ✅ 로그 확인
4. ✅ 다시 테스트

**여전히 안 된다면:**
- Supabase Dashboard → Edge Functions → Logs에서 에러 메시지 복사해주세요
- 정확한 에러 메시지를 보고 추가 디버깅하겠습니다
