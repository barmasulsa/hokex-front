# 🧪 OTP Edge Function 로컬 테스트 가이드

## ✅ 현재 상태
- ✅ OTP SQL 마이그레이션 완료
- ✅ Edge Function 코드 작성 완료 (`supabase/functions/send-otp-code/index.ts`)
- ✅ Resend API Key 환경변수 추가 완료

---

## 🔧 로컬 테스트 방법

### 방법 1: Docker로 Supabase 로컬 환경 실행 (권장)

1. **Docker Desktop 실행 확인**
   ```bash
   # Docker가 실행 중인지 확인
   docker --version
   ```

2. **Supabase 로컬 환경 시작**
   ```bash
   cd hokex-front
   npx supabase start
   ```

3. **Edge Function 로컬 서버 실행**
   ```bash
   npx supabase functions serve send-otp-code --env-file .env.local
   ```

4. **테스트 요청 보내기**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/send-otp-code \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
     -d '{"email": "test@example.com"}'
   ```

---

### 방법 2: 테스트 HTML 파일 사용

1. `test-otp-function.html` 파일 열기
2. Supabase URL과 Anon Key 입력
3. 이메일 입력 후 "OTP 코드 전송 테스트" 버튼 클릭

---

### 방법 3: 직접 프로덕션 배포 후 테스트

Docker 설치가 어려운 경우, 직접 배포 후 테스트하는 것이 더 빠를 수 있습니다.

1. **Edge Function 배포**
   ```bash
   cd hokex-front
   npx supabase functions deploy send-otp-code
   ```

2. **배포 후 테스트**
   - `test-otp-function.html` 파일 사용
   - 또는 실제 로그인 페이지에서 테스트

---

## 📋 필요한 환경변수

Edge Function이 제대로 작동하려면 다음 환경변수가 필요합니다:

```bash
# Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase Dashboard → Edge Functions → Secrets
RESEND_API_KEY=re_xxxxxxxxxxxxx (✅ 이미 추가됨)
```

---

## 🔍 Function 코드 검증 체크리스트

### ✅ 코드 구조
- [x] CORS 헤더 설정
- [x] OPTIONS 요청 처리
- [x] 이메일 validation
- [x] 6자리 OTP 생성
- [x] DB에 OTP 저장 (5분 유효)
- [x] 기존 미사용 OTP 삭제
- [x] Resend로 이메일 발송
- [x] HTML 이메일 템플릿
- [x] 에러 처리

### ✅ 보안
- [x] Service Role Key 사용 (DB 접근)
- [x] IP 주소 기록
- [x] 이메일당 1개만 유효 (중복 방지)
- [x] 만료 시간 설정 (5분)

### ✅ 이메일 템플릿
- [x] 반응형 디자인
- [x] HOKEX 브랜딩
- [x] 명확한 OTP 코드 표시
- [x] 보안 안내 메시지

---

## 🚀 다음 단계

Docker 없이 진행하려면:

### 옵션 A: 직접 배포하고 테스트
```bash
npx supabase functions deploy send-otp-code
```

### 옵션 B: Docker 설치 후 로컬 테스트
1. Docker Desktop 설치: https://docs.docker.com/desktop/
2. 위의 "방법 1" 단계 진행

---

## 📝 배포 명령어

```bash
# hokex-front 디렉토리에서
npx supabase functions deploy send-otp-code

# 배포 후 로그 확인
npx supabase functions logs send-otp-code --tail
```

---

## ✉️ 테스트 이메일 예시

배포 후 받게 될 이메일:

```
제목: [HOKEX] 로그인 인증 코드: 123456

본문:
┌──────────────────────┐
│       HOKEX         │
│ 전국 전시·컨벤션 정보 플랫폼 │
└──────────────────────┘

로그인 인증 코드

┌────────────────┐
│   123456       │
└────────────────┘

⏱️ 유효 시간: 5분
🔒 보안: 타인에게 공유하지 마세요.
❓ 요청하지 않았나요? 이 이메일을 무시하세요.
```

---

어떤 방법으로 진행하시겠어요?
1. 직접 배포 (가장 빠름)
2. Docker 설치 후 로컬 테스트
