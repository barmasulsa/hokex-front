# ✅ Stibee 자동 동기화 설정 완료

## 완료된 작업

### 1. 테스트 이메일 수동 추가 ✅
- 이메일: `lcw7914875@gmail.com`
- 상태: DB에 추가 완료
- 파일: `add-test-email-now.sql`

### 2. 1분 주기 자동 동기화 설정 ✅
- Cron Job 이름: `stibee-sync-1min`
- 실행 주기: 매분 (`* * * * *`)
- 상태: 활성화 완료 (`true`)
- 파일: `setup-1min-auto-sync.sql`

---

## 현재 상태

### 자동 동기화 작동 중
- ⏱️ **매 1분마다** Stibee에서 구독자 목록을 가져와 DB에 동기화
- 🔄 **자동으로** 새 구독자가 DB에 추가됨
- 🚀 **즉시** 웹사이트 로그인 가능

### 동작 방식
```
Stibee 구독 완료
    ↓
최대 1분 대기 (Cron Job 실행 주기)
    ↓
자동으로 DB에 추가
    ↓
웹사이트 로그인 가능
```

---

## 다음 단계

### 1. 동기화 작동 확인 (지금 바로)

**Supabase Dashboard에서 실행:**
```sql
-- verify-1min-sync-working.sql 파일 내용 실행
```

**확인 사항:**
- ✅ Cron Job이 `active = true`인가?
- ✅ 최근 1분 내 실행 기록이 있는가?
- ✅ 테스트 이메일의 `last_synced_at`이 최근인가?

---

### 2. 웹사이트 로그인 테스트

**테스트 순서:**
1. 웹사이트 로그인 페이지 접속
2. 이메일: `lcw7914875@gmail.com` 입력
3. 로그인 시도

**예상 결과:**
- ✅ 로그인 성공
- ✅ "가입이 안 되었다"는 오류 없음

**만약 로그인 실패하면:**
- 브라우저 개발자 도구 → Console 탭 확인
- Network 탭에서 API 요청 확인
- 에러 메시지 복사해서 알려주세요

---

### 3. 새 구독자 테스트

**테스트 순서:**
1. Stibee에서 새 이메일로 구독 (예: `test@example.com`)
2. 1분 대기
3. 웹사이트에서 해당 이메일로 로그인 시도

**예상 결과:**
- ✅ 1분 후 자동으로 DB에 추가됨
- ✅ 로그인 성공

---

## 모니터링 방법

### 실시간 동기화 상태 확인

**SQL Editor에서 실행:**
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
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'stibee-sync-1min')
  AND start_time > NOW() - INTERVAL '5 minutes'
ORDER BY start_time DESC;
```

**정상 상태:**
- `status`: `succeeded`
- `return_message`: (비어있거나 성공 메시지)
- 실행 시간: 1~5초

**비정상 상태:**
- `status`: `failed`
- `return_message`: 에러 메시지 포함
- 실행 시간: 매우 길거나 0초

---

### Edge Function 로그 확인

**Supabase Dashboard:**
1. **Edge Functions** 메뉴 클릭
2. `sync-stibee-subscribers` 선택
3. **Logs** 탭 클릭

**정상 로그:**
```
🔄 Starting Stibee subscriber sync...
📡 Fetching offset 0 (iteration 1)...
📊 Offset 0: 123 subscribers
📊 Total subscribers fetched: 123
💾 Upserting 123 subscribers to DB...
✅ Batch 1 inserted: 123 records
✅ Sync completed: 123 inserted, 0 errors
```

**비정상 로그:**
```
❌ Stibee API error: 401
❌ Error: Failed to fetch subscribers from Stibee
```

---

## 문제 해결

### 문제 1: Cron Job이 실행 안 됨

**증상:**
- `cron.job_run_details`에 최근 기록 없음
- 구독자가 추가되지 않음

**해결:**
```sql
-- Cron Job 재시작
SELECT cron.unschedule('stibee-sync-1min');

SELECT cron.schedule(
  'stibee-sync-1min',
  '* * * * *',
  $
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  );
  $
);
```

---

### 문제 2: Edge Function 에러

**증상:**
- Cron Job은 실행되지만 `status = failed`
- Edge Function 로그에 에러 메시지

**해결:**
1. Edge Function 로그에서 에러 메시지 확인
2. 환경 변수 확인:
   - `STIBEE_API_KEY`
   - `STIBEE_LIST_ID`
3. Stibee API 키 유효성 확인

---

### 문제 3: 로그인 여전히 실패

**증상:**
- DB에 구독자 데이터는 있음
- 로그인 시 "가입 안 됨" 오류

**해결:**
1. 로그인 API가 `stibee_subscribers` 테이블을 조회하는지 확인
2. 이메일 대소문자 일치 확인:
```sql
SELECT email
FROM stibee_subscribers
WHERE LOWER(email) = LOWER('lcw7914875@gmail.com');
```
3. RLS 정책 확인:
```sql
SELECT *
FROM pg_policies
WHERE tablename = 'stibee_subscribers';
```

---

## 성능 최적화 (선택사항)

### 1분 주기 → 5분 주기로 변경

1분 주기는 테스트용으로 좋지만, 운영 환경에서는 5분 또는 10분 주기가 적절합니다.

**5분 주기로 변경:**
```sql
SELECT cron.unschedule('stibee-sync-1min');

SELECT cron.schedule(
  'stibee-sync-5min',
  '*/5 * * * *', -- 5분마다 실행
  $
  SELECT net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  );
  $
);
```

**장점:**
- Supabase Edge Function 호출 횟수 감소 (비용 절감)
- Stibee API 호출 횟수 감소 (Rate Limit 여유)

**단점:**
- 구독 후 로그인까지 최대 5분 대기

---

## 요약

### ✅ 완료된 것
1. 테스트 이메일 DB 추가
2. 1분 주기 자동 동기화 설정
3. Cron Job 활성화

### 🔄 진행 중
- 매 1분마다 Stibee → Supabase 자동 동기화

### 📋 다음 할 일
1. `verify-1min-sync-working.sql` 실행 → 동기화 작동 확인
2. 웹사이트에서 로그인 테스트
3. 새 구독자로 테스트

### ⏸️ 보류 중
- Gmail 구독 확인 메일 문제 (나중에 해결)

---

## 관련 파일

- ✅ `add-test-email-now.sql` - 테스트 이메일 수동 추가
- ✅ `setup-1min-auto-sync.sql` - 1분 주기 Cron Job 설정
- 📊 `verify-1min-sync-working.sql` - 동기화 작동 확인
- 📖 `DIAGNOSE_SUBSCRIBER_LOGIN_ISSUE.md` - 문제 진단 가이드
- 📖 `STIBEE_AUTO_SYNC_SETUP.md` - 자동 동기화 설정 가이드

---

## 문의

문제가 발생하면:
1. `verify-1min-sync-working.sql` 실행 결과 공유
2. Edge Function 로그 확인
3. 웹사이트 로그인 시 에러 메시지 공유
