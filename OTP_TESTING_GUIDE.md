# OTP Edge Function 테스트 가이드 (개발 서버)

## 🎯 목표
로컬 개발 서버에서 OTP 기능을 테스트합니다.

---

## 방법 1: Supabase Dashboard에서 배포 후 테스트 (추천)

### 1단계: Edge Function 배포

1. https://supabase.com/dashboard 접속
2. 호켁스 프로젝트 선택
3. **Edge Functions** → **Create a new function**
4. Function 이름: `send-otp-code`
5. `supabase/functions/send-otp-code/index.ts` 코드 복사 → 붙여넣기
6. **Deploy** 클릭

### 2단계: 환경 변수 설정

Dashboard → **Edge Functions** → **send-otp-code** → **Settings** → **Secrets**

필요한 환경 변수:
- `SUPABASE_URL`: 자동 설정됨
- `SUPABASE_SERVICE_ROLE_KEY`: 자동 설정됨  
- `RESEND_API_KEY`: Resend API 키 (선택사항)

### 3단계: 로컬 개발 서버에서 테스트

```bash
cd hokex-front
npm run dev
```

브라우저에서 http://localhost:5173 접속 후:

1. 로그인 페이지로 이동
2. 이메일 입력: `your-email@example.com`
3. "인증 코드 받기" 버튼 클릭
4. 개발자 도구 콘솔에서 응답 확인

---

## 방법 2: Edge Function을 직접 호출하여 테스트

### PowerShell에서 테스트:

```powershell
$url = "https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-otp-code"
$headers = @{
    "apikey" = "[YOUR_ANON_KEY]"
    "Content-Type" = "application/json"
}
$body = @{
    email = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
```

**필요한 값:**
- `YOUR_PROJECT_REF`: Dashboard → Settings → API → Project URL
- `YOUR_ANON_KEY`: Dashboard → Settings → API → anon/public key

### 예상 응답:

성공:
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

실패:
```json
{
  "error": "Email is required"
}
```

---

## 방법 3: Postman/Insomnia로 테스트

1. **Request 생성**
   - Method: `POST`
   - URL: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-otp-code`

2. **Headers 설정**
   ```
   apikey: [YOUR_ANON_KEY]
   Content-Type: application/json
   ```

3. **Body 설정** (JSON)
   ```json
   {
     "email": "test@example.com"
   }
   ```

4. **Send** 클릭

---

## 테스트 시나리오

### ✅ 정상 케이스
1. 유효한 이메일로 OTP 요청
2. DB에 OTP 코드 저장 확인
3. 5분 후 만료 확인

### ❌ 에러 케이스
1. 이메일 없이 요청
2. 잘못된 이메일 형식
3. 동일 이메일로 중복 요청

---

## DB에서 OTP 확인

Supabase Dashboard → **Table Editor** → `email_verification_codes`

```sql
SELECT * FROM email_verification_codes 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

확인 사항:
- `code`: 6자리 숫자
- `expires_at`: 현재 시간 + 5분
- `used_at`: NULL (아직 사용 안 함)

---

## 로그 확인

Dashboard → **Edge Functions** → **send-otp-code** → **Logs**

- 요청/응답 로그 확인
- 에러 메시지 확인
- 실행 시간 확인

---

## 🐛 문제 해결

### Edge Function이 실행되지 않는 경우

1. **배포 상태 확인**
   - Dashboard → Edge Functions → 녹색 체크마크 확인

2. **API Key 확인**
   - Dashboard → Settings → API
   - anon/public key 복사

3. **CORS 에러**
   - 개발 서버 URL 확인: `http://localhost:5173`
   - CORS 설정이 `*`로 되어있는지 확인

### OTP가 DB에 저장되지 않는 경우

1. **RLS 정책 확인**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'email_verification_codes';
   ```

2. **Service Role Key 확인**
   - Dashboard → Settings → API
   - service_role key가 환경 변수에 있는지 확인

---

## 다음 단계

1. ✅ Edge Function 배포
2. ⬜ 로컬 개발 서버에서 테스트
3. ⬜ OTP 검증 로직 테스트
4. ⬜ 프론트엔드 통합 테스트
5. ⬜ 프로덕션 배포

**현재 진행 중: 로컬 개발 서버 테스트**
