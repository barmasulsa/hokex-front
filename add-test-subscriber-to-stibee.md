# 테스트 이메일 Stibee에 추가하기

## 방법 1: Stibee 대시보드에서 직접 추가 (가장 간단)

1. **Stibee 로그인**: https://stibee.com
2. **주소록** 선택
3. **구독자 추가** 버튼 클릭
4. 이메일 입력: `lcw7914875@gmail.com`
5. **추가** 버튼 클릭

→ 1분 이내에 DB에 자동 동기화됩니다.

---

## 방법 2: Stibee API로 추가 (프로그래밍 방식)

### 필요한 정보
- Stibee API Key
- Stibee List ID

### Bash 스크립트 (Mac/Linux)

```bash
#!/bin/bash

STIBEE_API_KEY="your_api_key_here"
STIBEE_LIST_ID="your_list_id_here"
TEST_EMAIL="lcw7914875@gmail.com"

curl -X POST \
  "https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers" \
  -H "AccessToken: ${STIBEE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"subscribers\": [
      {
        \"email\": \"${TEST_EMAIL}\"
      }
    ]
  }"
```

### PowerShell (Windows)

```powershell
$STIBEE_API_KEY = "your_api_key_here"
$STIBEE_LIST_ID = "your_list_id_here"
$TEST_EMAIL = "lcw7914875@gmail.com"

$headers = @{
    "AccessToken" = $STIBEE_API_KEY
    "Content-Type" = "application/json"
}

$body = @{
    subscribers = @(
        @{
            email = $TEST_EMAIL
        }
    )
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://api.stibee.com/v1/lists/$STIBEE_LIST_ID/subscribers" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

---

## 방법 3: 수동 동기화 트리거 (이미 Stibee에 있는 경우)

만약 이메일이 이미 Stibee에 있다면, 수동으로 동기화를 트리거할 수 있습니다.

### Supabase SQL Editor에서 실행

```sql
-- 즉시 동기화 실행
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

---

## 확인 방법

### 1. Stibee에서 확인
1. Stibee 대시보드 → 주소록
2. 구독자 목록에서 `lcw7914875@gmail.com` 검색

### 2. DB에서 확인 (1분 후)
```sql
SELECT * 
FROM stibee_subscribers 
WHERE email = 'lcw7914875@gmail.com'
ORDER BY created_at DESC;
```

---

## 예상 결과

### Stibee 추가 후 1분 이내:
```
email: lcw7914875@gmail.com
subscribed_at: 2026-05-22 XX:XX:XX
last_synced_at: 2026-05-22 XX:XX:XX
created_at: 2026-05-22 XX:XX:XX
```

---

## 문제 해결

### 1분 후에도 DB에 없는 경우:

1. **Cron Job 확인**
```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%stibee%';
```

2. **Edge Function 로그 확인**
- Supabase Dashboard → Edge Functions
- `sync-stibee-subscribers` 선택
- Logs 탭에서 최근 실행 확인

3. **수동 동기화 실행**
- 위 "방법 3" 참고

---

## 다음 단계

1. ✅ Stibee에 테스트 이메일 추가
2. ⏱️ 1분 대기
3. ✅ DB에서 확인
4. ✅ 성공 확인!
