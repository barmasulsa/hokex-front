# Stibee 구독자 DB 동기화 시스템 배포 가이드

## 개요
Stibee API에서 구독자 목록을 DB에 저장하여 로그인 체크 속도를 향상시키고, API 응답 누락 문제를 해결합니다.

## 배포 순서

### 1단계: DB 테이블 생성

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 파일: supabase-migrations/create-stibee-subscribers-table.sql 내용 복사
```

### 2단계: Edge Function 배포

#### 2-1. 동기화 Function 배포

1. Supabase Dashboard → Edge Functions
2. "Create a new function" 클릭
3. Function name: `sync-stibee-subscribers`
4. `supabase/functions/sync-stibee-subscribers/index.ts` 내용 복사하여 붙여넣기
5. Deploy 클릭

#### 2-2. 로그인 체크 Function 업데이트

1. Supabase Dashboard → Edge Functions
2. `check-stibee-subscriber` 선택
3. `supabase/functions/check-stibee-subscriber/index.ts` 내용 복사하여 붙여넣기
4. Deploy 클릭

### 3단계: 환경 변수 확인

Supabase Dashboard → Edge Functions → Settings에서 확인:

- `STIBEE_API_KEY`: 이미 설정됨
- `STIBEE_LIST_ID`: 이미 설정됨
- `SUPABASE_URL`: 자동 설정됨
- `SUPABASE_SERVICE_ROLE_KEY`: 자동 설정됨

### 4단계: 초기 동기화 실행

#### 방법 1: Supabase Dashboard에서 직접 실행

1. Edge Functions → `sync-stibee-subscribers` 선택
2. "Invoke function" 클릭
3. Request body: `{}`
4. Invoke 클릭

#### 방법 2: curl 명령어로 실행

```bash
curl -X POST \
  https://[YOUR-PROJECT-ID].supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer [YOUR-ANON-KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5단계: 자동 동기화 설정 (선택사항)

#### Supabase Cron Job 설정

Supabase Dashboard → Database → Cron Jobs:

```sql
-- 매 시간마다 동기화
SELECT cron.schedule(
  'sync-stibee-hourly',
  '0 * * * *',  -- 매 시간 0분
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-ID].supabase.co/functions/v1/sync-stibee-subscribers',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

또는 매일 1회:

```sql
-- 매일 새벽 3시에 동기화
SELECT cron.schedule(
  'sync-stibee-daily',
  '0 3 * * *',  -- 매일 03:00
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-ID].supabase.co/functions/v1/sync-stibee-subscribers',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## 작동 방식

### 로그인 체크 프로세스

1. **관리자 이메일 체크** (즉시 통과)
   - `lcw5525@naver.com`
   - `ojwkey@naver.com`

2. **DB 조회** (1차 체크 - 빠름)
   - `stibee_subscribers` 테이블에서 이메일 검색
   - 있으면 즉시 로그인 허용

3. **Stibee API 조회** (2차 체크 - 느림)
   - DB에 없으면 Stibee API 직접 조회
   - 페이지네이션으로 전체 구독자 검색
   - 발견되면 DB에 저장 후 로그인 허용

### 동기화 프로세스

1. Stibee API에서 전체 구독자 목록 가져오기 (페이지네이션)
2. DB에 upsert (있으면 업데이트, 없으면 삽입)
3. 1시간 이상 동기화되지 않은 구독자 삭제 (구독 취소된 사용자)

## 장점

1. **빠른 로그인**: DB 조회가 API 조회보다 훨씬 빠름
2. **안정성**: API 일시적 오류에도 DB에서 확인 가능
3. **누락 방지**: API 응답 누락 문제 해결
4. **실시간 백업**: DB에 없으면 API로 실시간 확인

## 테스트

### 1. 동기화 테스트

```bash
# 동기화 실행
curl -X POST https://[PROJECT-ID].supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer [ANON-KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'

# 결과 확인
# {
#   "success": true,
#   "totalFetched": 1567,
#   "inserted": 1567,
#   "errors": 0,
#   "syncedAt": "2026-05-18T..."
# }
```

### 2. DB 확인

Supabase Dashboard → Table Editor → `stibee_subscribers`:

```sql
-- 전체 구독자 수 확인
SELECT COUNT(*) FROM stibee_subscribers;

-- 특정 이메일 확인
SELECT * FROM stibee_subscribers WHERE email = 'ojwkey@naver.com';

-- 최근 동기화 시간 확인
SELECT MAX(last_synced_at) FROM stibee_subscribers;
```

### 3. 로그인 테스트

1. `ojwkey@naver.com`으로 로그인 시도
2. Edge Function Logs 확인:
   - `🔍 Checking DB for subscriber: ojwkey@naver.com`
   - `✅ Found in DB, last synced: ...`
   - `✅ Admin email detected` (관리자인 경우)

## 문제 해결

### Q: 동기화 후에도 로그인이 안 됩니다

```sql
-- DB에 이메일이 있는지 확인
SELECT * FROM stibee_subscribers WHERE email = 'ojwkey@naver.com';

-- 없으면 수동으로 추가
INSERT INTO stibee_subscribers (email, last_synced_at)
VALUES ('ojwkey@naver.com', NOW());
```

### Q: 동기화가 실패합니다

Edge Function Logs 확인:
- Stibee API 키가 올바른지 확인
- List ID가 올바른지 확인
- API 응답 구조 확인

### Q: 구독 취소한 사용자가 여전히 로그인됩니다

동기화를 다시 실행하면 1시간 이상 동기화되지 않은 구독자가 자동 삭제됩니다.

## 모니터링

### 동기화 상태 확인

```sql
-- 마지막 동기화 시간
SELECT MAX(last_synced_at) as last_sync FROM stibee_subscribers;

-- 오래된 구독자 (1시간 이상)
SELECT COUNT(*) FROM stibee_subscribers 
WHERE last_synced_at < NOW() - INTERVAL '1 hour';

-- 전체 구독자 수
SELECT COUNT(*) FROM stibee_subscribers;
```

### Edge Function Logs

Supabase Dashboard → Edge Functions → Logs:
- 동기화 성공/실패 로그
- 로그인 체크 로그
- API 호출 로그

## 다음 단계

1. Supabase Dashboard에서 테이블 생성
2. Edge Function 배포
3. 초기 동기화 실행
4. 로그인 테스트
5. Cron Job 설정 (자동 동기화)
