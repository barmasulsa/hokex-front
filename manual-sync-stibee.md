# Stibee 구독자 수동 동기화 가이드

## 방법 1: Supabase Dashboard에서 실행 (가장 쉬움)

1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Edge Functions** 클릭
4. `sync-stibee-subscribers` 함수 선택
5. 오른쪽 상단 **Invoke** 버튼 클릭
6. 팝업에서 **Invoke Function** 버튼 클릭
7. 결과 확인 (1분 정도 소요)

**예상 결과:**
```json
{
  "success": true,
  "totalFetched": 123,
  "inserted": 123,
  "errors": 0,
  "syncedAt": "2026-05-23T..."
}
```

---

## 방법 2: SQL Editor에서 Cron Job 수동 트리거

```sql
-- Cron Job을 즉시 실행 (다음 스케줄을 기다리지 않음)
SELECT cron.schedule(
  'stibee-sync-manual-trigger',
  '* * * * *',
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

-- 1분 후 삭제
SELECT cron.unschedule('stibee-sync-manual-trigger');
```

---

## 방법 3: 테스트 이메일 직접 추가 (긴급)

구독자 데이터를 기다릴 수 없다면 테스트 이메일을 직접 추가:

```sql
INSERT INTO stibee_subscribers (email, subscribed_at, last_synced_at)
VALUES (
  'lcw7914875@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET 
  last_synced_at = NOW(),
  updated_at = NOW();

-- 확인
SELECT * FROM stibee_subscribers WHERE email = 'lcw7914875@gmail.com';
```

**즉시 로그인 가능!**

---

## 동기화 후 확인

```sql
-- 1. 테스트 이메일 확인
SELECT 
  email,
  subscribed_at,
  last_synced_at,
  created_at
FROM stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 2. 최근 동기화된 구독자 확인
SELECT 
  email,
  last_synced_at
FROM stibee_subscribers
ORDER BY last_synced_at DESC
LIMIT 10;

-- 3. 전체 구독자 수
SELECT COUNT(*) as total FROM stibee_subscribers;
```

---

## 1분 주기 자동 동기화 설정

수동 동기화가 성공했다면, 1분 주기 자동 동기화를 설정하세요:

```sql
-- 기존 Cron Job 삭제
SELECT cron.unschedule('stibee-sync-hourly');
SELECT cron.unschedule('stibee-sync-1min');

-- 1분 주기 Cron Job 생성
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

-- 확인
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

## 문제 해결

### Edge Function이 없다고 나오는 경우

Edge Function이 배포되지 않았을 수 있습니다. 배포 확인:

1. **Edge Functions** 메뉴에서 `sync-stibee-subscribers` 함수가 있는지 확인
2. 없다면 `hokex-front/supabase/functions/sync-stibee-subscribers/` 폴더에서 배포 필요

배포 명령:
```bash
cd hokex-front
supabase functions deploy sync-stibee-subscribers
```

### 환경 변수 확인

Edge Function이 있지만 실행 실패하는 경우:

1. **Edge Functions** → `sync-stibee-subscribers` → **Settings** 탭
2. **Environment Variables** 확인:
   - `STIBEE_API_KEY`
   - `STIBEE_LIST_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 추천 순서

1. ✅ **방법 1** (Dashboard에서 Invoke) - 가장 쉽고 안전
2. ✅ **방법 3** (직접 추가) - 긴급 시 즉시 해결
3. ✅ **1분 주기 설정** - 재발 방지

---

## 완료!

이제 구독자가 로그인할 수 있습니다.
