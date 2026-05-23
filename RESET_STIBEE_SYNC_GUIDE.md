# Stibee 동기화 완전 초기화 가이드

## 개요

기존 Stibee 동기화 설정을 모두 삭제하고 처음부터 다시 설정합니다.

---

## 실행 방법

### 1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭

### 2. 초기화 스크립트 실행
1. `reset-stibee-sync-complete.sql` 파일 내용 복사
2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭

### 3. 결과 확인
스크립트가 자동으로 다음을 수행합니다:
- ✅ 기존 Cron Job 모두 삭제
- ✅ 기존 구독자 데이터 모두 삭제
- ✅ 새로운 5분 주기 Cron Job 생성
- ✅ 즉시 첫 동기화 실행
- ✅ 동기화 결과 확인

---

## 변경 사항

### 이전 설정
- **1분 주기** Cron Job
- 테스트 이메일만 수동 추가
- 동기화 불안정

### 새 설정
- **5분 주기** Cron Job (운영 환경에 적합)
- 모든 구독자 자동 동기화
- 깔끔한 초기 상태

---

## 작동 방식

```
Stibee 구독
    ↓
최대 5분 대기 (Cron Job 실행 주기)
    ↓
자동으로 DB에 추가
    ↓
웹사이트 로그인 가능
```

---

## 테스트 방법

### 1. Stibee에서 구독
1. Stibee 구독 폼에서 이메일 입력
2. 구독 완료

### 2. 5분 대기
- Cron Job이 자동으로 실행될 때까지 대기

### 3. 웹사이트 로그인
1. 웹사이트 로그인 페이지 접속
2. 구독한 이메일 입력
3. 로그인 시도

**예상 결과:**
- ✅ 로그인 성공
- ✅ "뉴스레터 구독자만 이용할 수 있습니다" 메시지 없음

---

## 문제 해결

### 문제 1: 5분 후에도 로그인 안 됨

**확인 사항:**
```sql
-- 해당 이메일이 DB에 있는지 확인
SELECT 
  email,
  last_synced_at
FROM stibee_subscribers
WHERE email = 'YOUR_EMAIL_HERE';
```

**해결 방법:**
- 이메일이 없으면: Stibee에서 구독 확인
- 이메일이 있으면: 로그인 로직 문제 (4단계로)

---

### 문제 2: Cron Job이 실행 안 됨

**확인 사항:**
```sql
-- Cron Job 실행 기록 확인
SELECT 
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-5min')
ORDER BY start_time DESC
LIMIT 5;
```

**해결 방법:**
- 실행 기록이 없으면: Cron Job 재생성
- `status = failed`이면: Edge Function 로그 확인

---

### 문제 3: Edge Function 에러

**확인 방법:**
1. Supabase Dashboard → **Edge Functions** 메뉴
2. `sync-stibee-subscribers` 선택
3. **Logs** 탭 클릭

**일반적인 에러:**
- `❌ Stibee API error: 401` → API 키 확인
- `❌ Stibee API error: 404` → 리스트 ID 확인
- `❌ Server configuration error` → 환경 변수 확인

**해결 방법:**
1. Edge Functions → `sync-stibee-subscribers` → **Settings**
2. **Environment Variables** 확인:
   - `STIBEE_API_KEY`
   - `STIBEE_LIST_ID`

---

### 문제 4: 수동 동기화 필요

**즉시 동기화 실행:**
```sql
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  ) as request_id;
```

30초 후 결과 확인:
```sql
SELECT 
  email,
  last_synced_at
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;
```

---

## 5분 주기 → 1분 주기 변경 (선택사항)

테스트 환경에서 빠른 동기화가 필요하면:

```sql
-- 기존 5분 주기 삭제
SELECT cron.unschedule('stibee-sync-5min');

-- 1분 주기로 변경
SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *', -- 매분 실행
  $$
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  );
  $$
);
```

**주의:**
- 1분 주기는 Supabase Edge Function 호출 횟수 증가
- 운영 환경에서는 5분 또는 10분 주기 권장

---

## 모니터링

### 실시간 동기화 상태 확인

```sql
-- 최근 5분간 동기화 기록
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as "실행_시간"
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-5min')
  AND start_time > NOW() - INTERVAL '5 minutes'
ORDER BY start_time DESC;
```

**정상 상태:**
- `status`: `succeeded`
- `return_message`: (비어있거나 성공 메시지)
- 실행 시간: 1~10초

**비정상 상태:**
- `status`: `failed`
- `return_message`: 에러 메시지 포함
- 실행 시간: 매우 길거나 0초

---

## 요약

### ✅ 완료된 작업
1. 기존 Cron Job 모두 삭제
2. 기존 구독자 데이터 모두 삭제
3. 새로운 5분 주기 Cron Job 생성
4. 첫 동기화 실행

### 🔄 현재 상태
- 매 5분마다 Stibee → Supabase 자동 동기화
- 모든 구독자 자동으로 DB에 추가
- 구독 후 최대 5분 후 로그인 가능

### 📋 다음 단계
1. Stibee에서 테스트 이메일로 구독
2. 5분 대기
3. 웹사이트에서 로그인 테스트
4. 정상 작동 확인

---

## 관련 파일

- ✅ `reset-stibee-sync-complete.sql` - 완전 초기화 및 재설정 스크립트
- 📖 `RESET_STIBEE_SYNC_GUIDE.md` - 이 가이드
- 📖 `DIAGNOSE_SUBSCRIBER_LOGIN_ISSUE.md` - 문제 진단 가이드
- 📖 `FIX_GMAIL_DELIVERY_ISSUE.md` - Gmail 메일 수신 문제 해결

---

## 문의

문제가 계속되면:
1. `reset-stibee-sync-complete.sql` 실행 결과 공유
2. Edge Function 로그 확인
3. 웹사이트 로그인 시 에러 메시지 공유
