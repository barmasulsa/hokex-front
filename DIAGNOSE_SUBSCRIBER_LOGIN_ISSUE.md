# 구독자 로그인 문제 진단 가이드

## 문제 상황
- 구독자가 Stibee에서 뉴스레터 구독 완료
- 웹사이트에서 로그인 시도 → "가입이 안 되었다"는 오류 발생
- 테스트 이메일: `lcw7914875@gmail.com`

---

## 진단 순서

### 1단계: DB에 구독자 데이터 확인

**Supabase Dashboard에서 실행:**
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭
4. `hokex-front/check-sync-status-complete.sql` 파일 내용 복사
5. **Run** 버튼 클릭

**확인 사항:**
- ✅ 테스트 이메일이 `stibee_subscribers` 테이블에 있는가?
- ✅ `last_synced_at` 값이 최근인가? (1시간 이내)
- ✅ 전체 구독자 수가 Stibee와 일치하는가?

**결과 해석:**

#### Case 1: 테스트 이메일이 DB에 없음
→ **동기화가 안 되고 있음** (2단계로)

#### Case 2: 테스트 이메일은 있지만 `last_synced_at`이 오래됨
→ **동기화가 멈춤** (2단계로)

#### Case 3: 테스트 이메일이 있고 최근 동기화됨
→ **로그인 로직 문제** (4단계로)

---

### 2단계: Cron Job 상태 확인

**SQL Editor에서 실행:**
```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%stibee%';
```

**확인 사항:**
- ✅ Cron Job이 등록되어 있는가?
- ✅ `active` 값이 `true`인가?
- ✅ `schedule` 값이 올바른가?
  - 1분 주기: `* * * * *`
  - 1시간 주기: `0 * * * *`

**결과 해석:**

#### Case 1: Cron Job이 없음
→ **Cron Job 재등록 필요** (3단계로)

#### Case 2: Cron Job은 있지만 `active = false`
→ **Cron Job 활성화 필요** (3단계로)

#### Case 3: Cron Job이 정상이지만 동기화 안 됨
→ **Edge Function 문제** (5단계로)

---

### 3단계: Cron Job 재등록

**1분 주기 Cron Job 생성:**

```sql
-- 기존 Cron Job 삭제 (있다면)
SELECT cron.unschedule('stibee-sync-1min');
SELECT cron.unschedule('stibee-sync-hourly');

-- 1분 주기 Cron Job 생성
SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *', -- 매분 실행
  $$
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**확인:**
```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'stibee-sync-1min';
```

**예상 결과:**
- `jobname`: `stibee-sync-1min`
- `schedule`: `* * * * *`
- `active`: `true`

---

### 4단계: 로그인 로직 확인

구독자 데이터는 있지만 로그인이 안 되는 경우:

**확인 사항:**
1. 로그인 페이지에서 어떤 에러 메시지가 나오는가?
2. 브라우저 개발자 도구 → Console에 에러가 있는가?
3. Network 탭에서 API 요청이 실패하는가?

**가능한 원인:**
- 로그인 API가 `stibee_subscribers` 테이블을 조회하지 않음
- 이메일 대소문자 불일치 (DB: 소문자, 입력: 대문자)
- RLS (Row Level Security) 정책 문제

**해결 방법:**

#### 이메일 대소문자 확인:
```sql
-- 대소문자 구분 없이 검색
SELECT email
FROM stibee_subscribers
WHERE LOWER(email) = LOWER('lcw7914875@gmail.com');
```

#### RLS 정책 확인:
```sql
-- stibee_subscribers 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'stibee_subscribers';
```

---

### 5단계: Edge Function 수동 실행 테스트

Cron Job은 정상이지만 동기화가 안 되는 경우:

**수동 실행:**
```sql
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**결과 확인:**
1. 위 SQL 실행 후 1분 대기
2. `check-sync-status-complete.sql` 다시 실행
3. 테스트 이메일이 추가되었는가?

**Edge Function 로그 확인:**
1. Supabase Dashboard → **Edge Functions** 메뉴
2. `sync-stibee-subscribers` 선택
3. **Logs** 탭 클릭
4. 최근 실행 로그 확인

**로그에서 확인할 내용:**
- ✅ `Starting Stibee subscriber sync...`
- ✅ `Total subscribers fetched: X`
- ✅ `Sync completed: X inserted`
- ❌ 에러 메시지가 있는가?

---

### 6단계: Stibee API 연동 확인

Edge Function이 실행되지만 데이터가 안 오는 경우:

**환경 변수 확인:**
1. Supabase Dashboard → **Edge Functions** 메뉴
2. `sync-stibee-subscribers` 선택
3. **Settings** 탭 클릭
4. **Environment Variables** 확인

**필수 환경 변수:**
- `STIBEE_API_KEY`: Stibee API 키
- `STIBEE_LIST_ID`: Stibee 리스트 ID
- `SUPABASE_URL`: Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key

**Stibee API 직접 테스트:**

PowerShell에서 실행:
```powershell
$headers = @{
    "AccessToken" = "YOUR_STIBEE_API_KEY"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.stibee.com/v1/lists/YOUR_LIST_ID/subscribers?offset=0&limit=10" -Method Get -Headers $headers

$response | ConvertTo-Json -Depth 10
```

**확인 사항:**
- ✅ API 응답이 정상인가?
- ✅ 구독자 목록이 반환되는가?
- ✅ 테스트 이메일이 포함되어 있는가?

---

## 빠른 해결 방법

### 방법 1: 수동 동기화 즉시 실행

```sql
-- Edge Function 수동 실행
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

1분 후 로그인 재시도

---

### 방법 2: 테스트 이메일 수동 추가

```sql
-- 테스트 이메일 직접 추가
INSERT INTO stibee_subscribers (email, subscribed_at, last_synced_at)
VALUES (
  'lcw7914875@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET last_synced_at = NOW();
```

즉시 로그인 재시도

---

### 방법 3: Cron Job 1분 주기로 변경

```sql
-- 기존 삭제
SELECT cron.unschedule('stibee-sync-hourly');

-- 1분 주기로 재등록
SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

1분 후 자동 동기화 시작

---

## 체크리스트

### ✅ DB 확인
- [ ] `check-sync-status-complete.sql` 실행
- [ ] 테스트 이메일이 DB에 있는지 확인
- [ ] 최근 동기화 시간 확인

### ✅ Cron Job 확인
- [ ] Cron Job 등록 상태 확인
- [ ] `active = true` 확인
- [ ] 스케줄 확인 (1분 또는 1시간)

### ✅ Edge Function 확인
- [ ] 수동 실행 테스트
- [ ] 로그에서 에러 확인
- [ ] 환경 변수 확인

### ✅ Stibee API 확인
- [ ] API 키 유효성 확인
- [ ] 리스트 ID 확인
- [ ] 직접 API 호출 테스트

### ✅ 로그인 로직 확인
- [ ] 에러 메시지 확인
- [ ] 브라우저 Console 확인
- [ ] RLS 정책 확인

---

## 예상 원인 순위

### 1순위: Cron Job이 멈춤 (70%)
- 1시간 주기 Cron이 설정되어 있지만 실행 안 됨
- 또는 Cron Job이 아예 등록 안 됨

**해결:** 3단계 Cron Job 재등록

---

### 2순위: Edge Function 환경 변수 문제 (20%)
- Stibee API 키가 만료됨
- 리스트 ID가 잘못됨

**해결:** 6단계 환경 변수 확인

---

### 3순위: 로그인 로직 문제 (10%)
- 로그인 API가 `stibee_subscribers` 테이블을 안 봄
- RLS 정책으로 접근 차단

**해결:** 4단계 로그인 로직 확인

---

## 다음 단계

1. ✅ `check-sync-status-complete.sql` 실행 → 현재 상태 파악
2. ✅ Cron Job 상태 확인 → 등록 여부 확인
3. ✅ 수동 동기화 실행 → 즉시 해결
4. ✅ 1분 주기 Cron 설정 → 재발 방지

---

## 문의

- Supabase 문서: https://supabase.com/docs
- Stibee API 문서: https://developers.stibee.com
- Edge Functions 가이드: https://supabase.com/docs/guides/functions

