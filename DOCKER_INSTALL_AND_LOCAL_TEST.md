# 🐳 Docker 설치 및 OTP Edge Function 로컬 테스트 가이드

## 1️⃣ Docker Desktop 설치

### Windows용 Docker Desktop 다운로드
1. 공식 사이트 방문: https://www.docker.com/products/docker-desktop/
2. **"Download for Windows - AMD64"** 클릭 (일반 Windows PC용)
3. 다운로드한 `Docker Desktop Installer.exe` 실행

### 설치 옵션
- ✅ **WSL 2 backend 사용** (권장)
- ✅ **Add shortcut to desktop**

### 설치 확인
```bash
# 설치 후 CMD 또는 PowerShell에서 확인
docker --version
```

예상 출력:
```
Docker version 24.x.x, build xxxxxxx
```

---

## 2️⃣ Supabase CLI 로컬 환경 시작

### Supabase 로컬 환경 초기화

```bash
cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"

# Supabase 로컬 환경 시작 (Docker 필요)
npx supabase start
```

### 초기 시작 시간
- ⏱️ 첫 실행 시 5-10분 소요 (Docker 이미지 다운로드)
- 이후 실행은 1-2분 이내

### 로컬 환경 정보
시작 완료 후 다음 정보가 표시됩니다:

```
Started supabase local development setup.

API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

📝 **이 정보를 복사해두세요! 테스트할 때 필요합니다.**

---

## 3️⃣ Edge Function 로컬 실행

### 환경변수 파일 생성

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# hokex-front/.env.local
RESEND_API_KEY=re_your_resend_api_key_here
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Function 서버 실행

```bash
# hokex-front 디렉토리에서
npx supabase functions serve send-otp-code --env-file .env.local
```

예상 출력:
```
Setting up Edge Functions runtime...
Serving functions on http://localhost:54321/functions/v1/
  - send-otp-code
```

---

## 4️⃣ 로컬 테스트 실행

### 방법 1: cURL로 직접 테스트

```bash
curl -X POST http://localhost:54321/functions/v1/send-otp-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -d "{\"email\": \"test@hokex.kr\"}"
```

### 방법 2: test-otp-function.html 사용

1. `test-otp-function.html` 파일 열기
2. 다음 값 수정:

```javascript
// 파일 내부에서 수정
const SUPABASE_URL = 'http://localhost:54321';  // 로컬 URL로 변경
const SUPABASE_ANON_KEY = 'YOUR_LOCAL_ANON_KEY';  // 로컬 anon key
```

3. 브라우저에서 파일 열기
4. 이메일 입력 후 "OTP 코드 전송 테스트" 클릭

### 방법 3: Postman/Insomnia 사용

**Request 설정:**
- Method: `POST`
- URL: `http://localhost:54321/functions/v1/send-otp-code`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_LOCAL_ANON_KEY
  ```
- Body (JSON):
  ```json
  {
    "email": "test@hokex.kr"
  }
  ```

---

## 5️⃣ 예상 응답

### ✅ 성공 시

```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

### ❌ 실패 시

```json
{
  "error": "Failed to send OTP email",
  "message": "이메일 전송에 실패했습니다. 관리자에게 승인을 요청해주세요."
}
```

---

## 6️⃣ 이메일 확인

### Inbucket (로컬 메일 서버)

로컬 환경에서는 실제 이메일 대신 Inbucket으로 전송됩니다:

1. 브라우저에서 열기: http://localhost:54324
2. 받은편지함에서 OTP 이메일 확인
3. 6자리 코드 확인

**주의:** Resend는 로컬에서 실제로 작동하지 않을 수 있습니다. 
실제 이메일 테스트는 프로덕션 배포 후에 해야 합니다.

---

## 7️⃣ DB 확인

### Supabase Studio에서 확인

1. 브라우저에서 열기: http://localhost:54323
2. Table Editor → `email_verification_codes` 테이블 선택
3. OTP 코드가 저장되었는지 확인

### SQL로 직접 확인

```sql
-- 최근 OTP 코드 조회
SELECT * 
FROM email_verification_codes 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 8️⃣ 로컬 환경 종료

### Edge Function 서버 중지
- `Ctrl + C` (실행 중인 터미널에서)

### Supabase 로컬 환경 중지

```bash
npx supabase stop
```

### 완전 정리 (컨테이너 삭제)

```bash
npx supabase stop --no-backup
```

---

## 🔧 문제 해결

### Docker가 실행되지 않는 경우

```bash
# Docker Desktop 실행 확인
docker ps

# Docker 재시작
# Windows: Docker Desktop 앱 재시작
```

### Port 충돌 오류

```bash
# 다른 포트 사용 (충돌 시)
npx supabase start --port 54325
```

### Edge Function이 시작되지 않는 경우

```bash
# Deno 캐시 정리
deno cache --reload supabase/functions/send-otp-code/index.ts

# Supabase 재시작
npx supabase stop
npx supabase start
```

---

## 🚀 로컬 테스트 완료 후

### 다음 단계: 프로덕션 배포

로컬 테스트가 성공하면:

```bash
# hokex-front 디렉토리에서
npx supabase functions deploy send-otp-code

# 배포 후 로그 확인
npx supabase functions logs send-otp-code --tail
```

---

## 📋 체크리스트

- [ ] Docker Desktop 설치 완료
- [ ] `docker --version` 확인
- [ ] `npx supabase start` 실행 성공
- [ ] 로컬 Supabase URL 및 Key 복사
- [ ] `.env.local` 파일 생성
- [ ] `npx supabase functions serve` 실행 성공
- [ ] cURL/HTML/Postman으로 테스트 성공
- [ ] Inbucket에서 이메일 확인 (http://localhost:54324)
- [ ] DB에서 OTP 코드 확인 (http://localhost:54323)
- [ ] 프로덕션 배포 준비 완료

---

## 💡 팁

1. **첫 실행 시 시간 소요**
   - Docker 이미지 다운로드로 인해 5-10분 소요
   - 이후 실행은 빠름

2. **실제 이메일 테스트**
   - Resend는 로컬에서 제한적
   - 실제 이메일 테스트는 프로덕션 배포 후 권장

3. **DB 데이터 유지**
   - `npx supabase stop` 사용 (데이터 유지)
   - `npx supabase stop --no-backup` 사용 (전체 삭제)

4. **개발 워크플로우**
   - 코드 수정 → Function 재시작 → 테스트 반복

---

완료! 🎉
