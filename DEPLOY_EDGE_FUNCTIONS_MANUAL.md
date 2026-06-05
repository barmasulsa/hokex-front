# Edge Functions 수동 배포 가이드

## CLI가 작동하지 않을 때 Supabase Dashboard로 직접 배포하기

### 1단계: Supabase Dashboard 접속

1. https://app.supabase.com 접속
2. 로그인
3. 프로젝트 선택

### 2단계: Edge Functions 메뉴로 이동

- 왼쪽 사이드바에서 **"Edge Functions"** 클릭

### 3단계: 각 Function 배포

아래 7개 Function을 하나씩 배포합니다.

---

## Function 1: check-stibee-subscriber

**목적**: 이메일이 Stibee 구독자인지 확인

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `check-stibee-subscriber`
3. 코드 입력 (파일 경로: `supabase/functions/check-stibee-subscriber/index.ts`)
4. 환경 변수 설정:
   - `STIBEE_API_KEY`: Stibee API 키
   - `STIBEE_LIST_ID`: Stibee 리스트 ID

**테스트**:
```bash
curl -X POST "YOUR_PROJECT_URL/functions/v1/check-stibee-subscriber" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Function 2: send-otp-code

**목적**: OTP 코드를 이메일로 발송

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `send-otp-code`
3. 코드 입력 (파일 경로: `supabase/functions/send-otp-code/index.ts`)
4. 환경 변수 설정:
   - `RESEND_API_KEY`: Resend API 키

**필요한 DB 테이블**:
- `email_verification_codes` (OTP 코드 저장)
- `pending_approvals` (이메일 발송 실패 시 대기 명단)

**테스트**:
```bash
curl -X POST "YOUR_PROJECT_URL/functions/v1/send-otp-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Function 3: verify-otp-code

**목적**: OTP 코드 검증 및 로그인 토큰 발급

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `verify-otp-code`
3. 코드 입력 (파일 경로: `supabase/functions/verify-otp-code/index.ts`)

**테스트**:
```bash
curl -X POST "YOUR_PROJECT_URL/functions/v1/verify-otp-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

---

## Function 4: stibee-webhook

**목적**: Stibee 웹훅 이벤트 처리

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `stibee-webhook`
3. 코드 입력 (파일 경로: `supabase/functions/stibee-webhook/index.ts`)

**Stibee 웹훅 설정**:
- Webhook URL: `YOUR_PROJECT_URL/functions/v1/stibee-webhook`
- Events: `subscriber.created`, `subscriber.deleted`

---

## Function 5: sync-stibee-subscribers

**목적**: Stibee 구독자 목록을 주기적으로 동기화

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `sync-stibee-subscribers`
3. 코드 입력 (파일 경로: `supabase/functions/sync-stibee-subscribers/index.ts`)
4. 환경 변수 설정:
   - `STIBEE_API_KEY`: Stibee API 키
   - `STIBEE_LIST_ID`: Stibee 리스트 ID

**Cron Job 설정** (Supabase Dashboard > Database > Cron Jobs):
```sql
SELECT cron.schedule(
  'sync-stibee-subscribers',
  '*/1 * * * *', -- 1분마다
  $$
  SELECT net.http_post(
    url := 'YOUR_PROJECT_URL/functions/v1/sync-stibee-subscribers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Function 6: unsubscribe-stibee

**목적**: Stibee 구독 해지

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `unsubscribe-stibee`
3. 코드 입력 (파일 경로: `supabase/functions/unsubscribe-stibee/index.ts`)
4. 환경 변수 설정:
   - `STIBEE_API_KEY`: Stibee API 키
   - `STIBEE_LIST_ID`: Stibee 리스트 ID

**테스트**:
```bash
curl -X POST "YOUR_PROJECT_URL/functions/v1/unsubscribe-stibee" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Function 7: update-visitor-stats-cache

**목적**: 방문자 통계 캐시 업데이트

**배포 방법**:
1. "Deploy new function" 버튼 클릭
2. Function 이름: `update-visitor-stats-cache`
3. 코드 입력 (파일 경로: `supabase/functions/update-visitor-stats-cache/index.ts`)

**Cron Job 설정** (매일 자정):
```sql
SELECT cron.schedule(
  'update-visitor-cache',
  '0 0 * * *', -- 매일 00:00
  $$
  SELECT net.http_post(
    url := 'YOUR_PROJECT_URL/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## 4단계: 환경 변수 설정

모든 Function에 공통으로 필요한 환경 변수:

### Supabase Dashboard > Settings > Edge Functions > Environment Variables

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 | `re_xxxxx` |
| `STIBEE_API_KEY` | Stibee API 키 | `xxxxx` |
| `STIBEE_LIST_ID` | Stibee 리스트 ID | `123456` |

---

## 5단계: 배포 확인

### Function 로그 확인
1. Supabase Dashboard > Edge Functions
2. 각 Function 클릭
3. "Logs" 탭에서 실행 로그 확인

### Function URL 확인
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME
```

---

## 6단계: 프론트엔드 연동

프론트엔드에서 Function URL 사용:

```typescript
// src/config/supabase.ts
export const SUPABASE_FUNCTION_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'

// 사용 예시
const response = await fetch(`${SUPABASE_FUNCTION_URL}/check-stibee-subscriber`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: 'test@example.com' })
})
```

---

## 트러블슈팅

### 1. CORS 에러
- 모든 Function에 CORS 헤더가 포함되어 있는지 확인
- OPTIONS 메서드 처리가 있는지 확인

### 2. 환경 변수 없음 에러
- Dashboard > Settings > Edge Functions > Environment Variables 확인
- Function 재배포

### 3. 타임아웃 에러
- Function 실행 시간 초과 (최대 150초)
- 코드 최적화 필요

### 4. 인증 에러
- `SUPABASE_SERVICE_ROLE_KEY` 확인
- anon key와 service role key 구분

---

## 대안: CLI로 배포 (CLI가 작동하면)

```powershell
# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_REF

# 전체 배포
supabase functions deploy

# 개별 배포
supabase functions deploy check-stibee-subscriber
supabase functions deploy send-otp-code
supabase functions deploy verify-otp-code
supabase functions deploy stibee-webhook
supabase functions deploy sync-stibee-subscribers
supabase functions deploy unsubscribe-stibee
supabase functions deploy update-visitor-stats-cache
```

---

## 완료 체크리스트

- [ ] 7개 Function 모두 배포 완료
- [ ] 환경 변수 설정 완료
- [ ] Cron Job 설정 완료 (sync-stibee-subscribers, update-visitor-stats-cache)
- [ ] Stibee Webhook URL 설정 완료
- [ ] 프론트엔드에 Function URL 적용
- [ ] 각 Function 테스트 완료
- [ ] 로그 확인 완료
