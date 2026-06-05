# OTP API 테스트 가이드

## 1. curl 명령어로 직접 테스트

```bash
# Windows CMD
curl -X POST ^
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-otp-code ^
  -H "apikey: YOUR_ANON_KEY" ^
  -H "Authorization: Bearer YOUR_ANON_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\"}"
```

```bash
# PowerShell
curl -Method POST `
  -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-otp-code" `
  -Headers @{
    "apikey" = "YOUR_ANON_KEY";
    "Authorization" = "Bearer YOUR_ANON_KEY";
    "Content-Type" = "application/json"
  } `
  -Body '{"email":"test@example.com"}'
```

## 2. 예상 응답

### 성공 시:
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

### 실패 시:
```json
{
  "error": "Email is required"
}
```

## 3. OTP 코드 확인 방법

1. Supabase Dashboard → Table Editor
2. `email_verification_codes` 테이블 선택
3. 필터: `email = 'test@example.com'`
4. `code` 컬럼에서 6자리 OTP 확인

## 4. 이메일 확인

- 받은 편지함에서 "[HOKEX] 로그인 인증 코드" 제목의 이메일 확인
- 발신자: HOKEX <onboarding@resend.dev>
- 이메일 템플릿에 6자리 코드 포함

## 5. 트러블슈팅

### "Email service not configured" 오류
→ RESEND_API_KEY 환경 변수가 설정되지 않음
→ Supabase Dashboard → Settings → Edge Functions → Add secret

### "Failed to generate OTP code" 오류
→ email_verification_codes 테이블이 없거나 권한 문제
→ RLS 정책 확인 필요

### 이메일이 오지 않음
→ 1. DB에 OTP 코드가 저장되었는지 확인
→ 2. Resend Dashboard에서 이메일 전송 로그 확인
→ 3. 스팸함 확인

### CORS 오류
→ Edge Function에 CORS 헤더가 설정되어 있어야 함 (이미 설정됨)

## 6. 다음 단계

1. ✅ OTP 발송 성공
2. ⏭️ OTP 검증 API 테스트
3. ⏭️ 프론트엔드 로그인 플로우 통합
