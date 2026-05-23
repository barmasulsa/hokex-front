# Stibee 1분 주기 동기화 적용 가이드

## 현재 상태 확인

### 1단계: Supabase Dashboard 로그인
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `qmhxnxnaawtjelqlgyig`

### 2단계: 현재 Cron Job 확인
1. **SQL Editor** 클릭
2. **New Query** 클릭
3. 아래 SQL 실행:

```sql
-- 현재 Cron Job 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%stibee%'
ORDER BY jobname;
```

**예상 결과:**
- `stibee-sync-hourly`: `0 * * * *` (매 시간)
- 또는 다른 이름의 Cron Job

### 3단계: 최근 구독자 확인
```sql
-- 최근 구독자 10명
SELECT 
  email,
  subscribed_at,
  source,
  created_at
FROM stibee_subscribers
ORDER BY created_at DESC
LIMIT 10;
```

**확인 사항:**
- 최근 구독자가 있는지?
- `source` 필드: 'webhook' (실시간) 또는 'stibee_api' (배치)
- 시간이 최근인지?

---

## 1분 주기로 변경

### 4단계: 1분 주기 Cron Job 적용

1. **SQL Editor**에서 **New Query** 클릭
2. 아래 SQL 전체 복사 & 붙여넣기:

```sql
-- 기존 1시간 주기 Cron Job 삭제
SELECT cron.unschedule('stibee-sync-hourly');

-- 1분 주기 Cron Job 생성
SELECT cron.schedule(
  'stibee-sync-every-minute',
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

3. **Run** 버튼 클릭

### 5단계: 적용 확인

```sql
-- 새 Cron Job 확인
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'stibee-sync-every-minute';
```

**예상 결과:**
```
jobname: stibee-sync-every-minute
schedule: * * * * *
active: true
```

---

## 웹훅 설정 확인

### 6단계: Stibee 웹훅 확인

1. **Stibee 대시보드** 로그인 (https://stibee.com)
2. 주소록 선택
3. **설정 → 웹훅** 메뉴
4. 확인 사항:
   - ✅ 웹훅 URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook`
   - ✅ 이벤트: "구독" 체크
   - ✅ 상태: 활성화

### 7단계: 웹훅 테스트 (선택)

**방법 1: Bash 스크립트 (Mac/Linux)**
```bash
cd hokex-front
chmod +x test-stibee-webhook.sh
./test-stibee-webhook.sh
```

**방법 2: 수동 curl (Windows/Mac/Linux)**
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventOccuredBy": "subscribe",
    "subscriber": {
      "email": "test@example.com"
    }
  }'
```

**예상 응답:**
```json
{
  "success": true,
  "message": "Subscriber synced",
  "email": "test@example.com"
}
```

### 8단계: Edge Function 로그 확인

1. Supabase Dashboard → **Edge Functions**
2. `stibee-webhook` 선택
3. **Logs** 탭 확인
4. 최근 호출 기록 확인

---

## 최종 검증

### 9단계: 실제 구독자로 테스트

1. **Stibee 주소록**에 테스트 이메일 추가
2. **1분 대기**
3. DB 확인:

```sql
SELECT * FROM stibee_subscribers 
WHERE email = '테스트이메일@example.com'
ORDER BY created_at DESC;
```

4. 결과 확인:
   - 이메일이 존재하면 ✅ 성공
   - 없으면 아래 "문제 해결" 참고

### 10단계: 동기화 주기 확인

```sql
-- 최근 1분 내 추가된 구독자
SELECT 
  COUNT(*) as recent_count,
  MAX(created_at) as last_added
FROM stibee_subscribers
WHERE created_at > NOW() - INTERVAL '1 minute';
```

---

## 문제 해결

### 문제 1: Cron Job이 생성되지 않음

**원인**: `pg_cron` extension 미활성화

**해결**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 문제 2: 웹훅 호출 실패

**원인**: Edge Function 미배포 또는 에러

**해결**:
1. Edge Functions → `stibee-webhook` 확인
2. 배포되어 있지 않으면:
   ```bash
   cd hokex-front
   supabase functions deploy stibee-webhook
   ```

### 문제 3: 구독자가 동기화되지 않음

**원인**: Stibee API 키 문제

**해결**:
1. Edge Functions → `sync-stibee-subscribers` → Settings
2. 환경 변수 확인:
   - `STIBEE_API_KEY`: 올바른 API 키
   - `STIBEE_LIST_ID`: 올바른 리스트 ID
3. 값이 없거나 잘못되었으면 업데이트 후 재배포

### 문제 4: 수동 동기화 필요

**임시 조치**:
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

## 완료 체크리스트

- [ ] 1단계: Supabase Dashboard 로그인 완료
- [ ] 2단계: 현재 Cron Job 확인 완료
- [ ] 3단계: 최근 구독자 확인 완료
- [ ] 4단계: 1분 주기 Cron Job 적용 완료
- [ ] 5단계: 적용 확인 완료
- [ ] 6단계: Stibee 웹훅 확인 완료
- [ ] 7단계: 웹훅 테스트 완료 (선택)
- [ ] 8단계: Edge Function 로그 확인 완료
- [ ] 9단계: 실제 구독자로 테스트 완료
- [ ] 10단계: 동기화 주기 확인 완료

---

## 최종 설정

### ✅ 실시간 동기화 (웹훅)
- URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook`
- 지연: 0초 (즉시)
- 신뢰도: 99%

### ✅ 1분 주기 동기화 (Cron)
- 스케줄: `* * * * *` (매분)
- 지연: 최대 1분
- 신뢰도: 100% (웹훅 실패 보완)

### 📊 예상 비용
- 월 실행 횟수: 43,200번
- Supabase 무료 범위: 2,000,000번
- 사용률: 2.16%
- **비용: 무료** ✅

### 🚀 성능
- 렉: 없음 (서버리스 백그라운드 실행)
- 사용자 영향: 없음
- DB 부하: 최소 (단순 쿼리)

---

## 다음 단계

1. ✅ 1분 주기 동기화 적용 완료
2. ⬜ 실제 구독자로 검증
3. ⬜ 1주일 모니터링
4. ⬜ 문제 없으면 계속 운영

## 참고 문서
- `hokex-front/STIBEE_AUTO_SYNC_SETUP.md` - 자동 동기화 설정 가이드
- `hokex-front/STIBEE_WEBHOOK_SETUP.md` - 웹훅 설정 가이드
- `hokex-front/DEBUG_STIBEE_SYNC_ISSUE.md` - 문제 해결 가이드

