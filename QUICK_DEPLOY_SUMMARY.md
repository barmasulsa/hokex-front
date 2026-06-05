# Edge Functions 빠른 배포 요약

## 현재 상황
- Supabase CLI가 PATH에 등록되지 않음
- Edge Function 코드는 모두 준비됨
- **수동 배포 필요**

## 빠른 배포 방법 (권장)

### 옵션 1: Supabase Dashboard에서 직접 배포 ⭐

1. https://app.supabase.com 접속
2. 프로젝트 선택
3. Edge Functions 메뉴 클릭
4. "Deploy new function" 클릭하여 각 Function 생성

**배포할 Function 목록**:
1. ✅ `check-stibee-subscriber` - 구독자 확인
2. ✅ `send-otp-code` - OTP 발송
3. ✅ `verify-otp-code` - OTP 검증
4. ✅ `stibee-webhook` - Stibee 웹훅
5. ✅ `sync-stibee-subscribers` - 구독자 동기화
6. ✅ `unsubscribe-stibee` - 구독 해지
7. ✅ `update-visitor-stats-cache` - 방문자 통계

**코드 위치**:
- `hokex-front/supabase/functions/[FUNCTION_NAME]/index.ts`

---

### 옵션 2: CLI 재설치 후 배포

**새 PowerShell 창 열기** (관리자 권한)

```powershell
# Scoop 설치 (없는 경우)
iex (new-object net.webclient).downloadstring('https://get.scoop.sh')

# Supabase CLI 설치
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# PowerShell 재시작 후
cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_REF

# 전체 배포
supabase functions deploy
```

---

## 필수 환경 변수 설정

Supabase Dashboard > Settings > Edge Functions > Environment Variables

| 변수명 | 설명 | 필요한 Function |
|--------|------|----------------|
| `RESEND_API_KEY` | Resend 이메일 API 키 | send-otp-code |
| `STIBEE_API_KEY` | Stibee API 키 | check-stibee-subscriber, sync-stibee-subscribers, unsubscribe-stibee |
| `STIBEE_LIST_ID` | Stibee 리스트 ID | 위와 동일 |

---

## Cron Job 설정 (중요!)

Supabase Dashboard > Database > Cron Jobs

### 1. 구독자 동기화 (1분마다)
```sql
SELECT cron.schedule(
  'sync-stibee-every-minute',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-stibee-subscribers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

### 2. 방문자 통계 업데이트 (매일 자정)
```sql
SELECT cron.schedule(
  'update-visitor-cache-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Stibee Webhook 설정

Stibee Dashboard > 리스트 설정 > Webhook

- **Webhook URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stibee-webhook`
- **Events**: 
  - ✅ 구독자 추가 (subscriber.created)
  - ✅ 구독자 삭제 (subscriber.deleted)

---

## 배포 후 테스트

### 1. check-stibee-subscriber 테스트
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-stibee-subscriber" \
  -H "Content-Type: application/json" \
  -d '{"email":"lcw5525@naver.com"}'
```

예상 결과:
```json
{
  "isSubscriber": true,
  "isAdmin": true,
  "email": "lcw5525@naver.com",
  "status": "ADMIN",
  "message": "Admin access granted"
}
```

### 2. send-otp-code 테스트
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-otp-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

예상 결과:
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

### 3. verify-otp-code 테스트
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-otp-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

---

## 프론트엔드 연동

### src/config/supabase.ts
```typescript
export const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

// 또는 직접 지정
export const SUPABASE_FUNCTION_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'
```

### 사용 예시
```typescript
// 구독자 확인
const checkSubscriber = async (email: string) => {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/check-stibee-subscriber`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  return response.json()
}

// OTP 발송
const sendOTP = async (email: string) => {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/send-otp-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  return response.json()
}

// OTP 검증
const verifyOTP = async (email: string, code: string) => {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/verify-otp-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  })
  return response.json()
}
```

---

## 완료 체크리스트

### 배포
- [ ] 7개 Function 모두 배포 완료
- [ ] 환경 변수 3개 설정 완료
- [ ] Function 로그에서 오류 없음 확인

### 연동
- [ ] Cron Job 2개 설정 완료
- [ ] Stibee Webhook URL 설정 완료
- [ ] 프론트엔드에 Function URL 적용

### 테스트
- [ ] check-stibee-subscriber 작동 확인
- [ ] send-otp-code 이메일 발송 확인
- [ ] verify-otp-code 로그인 성공 확인
- [ ] 실제 로그인 플로우 테스트 완료

---

## 다음 단계

배포 완료 후:
1. ✅ Function URL을 프론트엔드 환경 변수에 추가
2. ✅ 로그인 페이지에서 OTP 플로우 테스트
3. ✅ 관리자 이메일(lcw5525@naver.com)로 테스트
4. ✅ Stibee 구독자로 테스트
5. ✅ 구독하지 않은 이메일로 접근 차단 확인

---

## 도움말

**자세한 가이드**: 
- `DEPLOY_EDGE_FUNCTIONS_MANUAL.md` 참고

**문제 발생 시**:
- Supabase Dashboard > Edge Functions > Logs 확인
- CORS 에러: OPTIONS 메서드 처리 확인
- 인증 에러: Service Role Key 확인
- 타임아웃: Function 실행 시간 줄이기
