# 🚀 스티비 실시간 동기화 완전 설정 가이드

## 목표
1. ✅ **실시간 동기화**: 스티비에서 새 구독자 발생 시 즉시 DB 반영 (웹훅)
2. ✅ **기존 구독자 동기화**: 처음 설정 시 모든 구독자 가져오기
3. ✅ **1분마다 자동 동기화**: 백업용 정기 동기화

---

## 1단계: SQL 스크립트 실행

### Supabase Dashboard에서:
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (qmhxnxnaawtjelqlgyig)
3. 왼쪽 메뉴: **SQL Editor** 클릭
4. **New query** 클릭
5. `hokex-front/setup-stibee-realtime-sync.sql` 파일 내용 복사 & 붙여넣기
6. **Run** 버튼 클릭

### 실행 결과 확인:
```sql
-- 테이블 생성 확인
SELECT COUNT(*) FROM stibee_subscribers;
-- 결과: 0 (아직 구독자 없음)

-- Cron Job 생성 확인 (1분마다)
SELECT * FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-1min';
-- 결과: 1개 행 (Cron Job 생성됨)
```

---

## 2단계: Edge Functions 배포

### 터미널에서 실행:

```bash
cd hokex-front

# 1. sync-stibee-subscribers 함수 배포 (이미 있음)
npx supabase functions deploy sync-stibee-subscribers

# 2. stibee-webhook 함수 배포 (새로 만든 것)
npx supabase functions deploy stibee-webhook

# 3. check-stibee-subscriber 함수 배포 (이미 있음)
npx supabase functions deploy check-stibee-subscriber
```

---

## 3단계: Edge Functions 환경 변수 설정

### 모든 함수에 동일하게 설정:

#### sync-stibee-subscribers:
1. Supabase Dashboard → **Edge Functions** → `sync-stibee-subscribers` → **Settings**
2. **Secrets** 섹션에서 **Add secret** 클릭
3. 다음 2개 변수 추가:
```
Name: STIBEE_API_KEY
Value: [Stibee API 키]

Name: STIBEE_LIST_ID
Value: [Stibee 리스트 ID]
```

#### stibee-webhook:
1. **Edge Functions** → `stibee-webhook` → **Settings**
2. 동일하게 추가:
```
Name: STIBEE_API_KEY
Value: [동일한 API 키]

Name: STIBEE_LIST_ID
Value: [동일한 리스트 ID]
```

#### check-stibee-subscriber:
1. **Edge Functions** → `check-stibee-subscriber` → **Settings**
2. 동일하게 추가:
```
Name: STIBEE_API_KEY
Value: [동일한 API 키]

Name: STIBEE_LIST_ID
Value: [동일한 리스트 ID]
```

---

## 4단계: 스티비 웹훅 설정

### Stibee Dashboard에서:
1. https://stibee.com 접속 및 로그인
2. 사용 중인 **주소록** 선택
3. 왼쪽 메뉴: **설정** → **웹훅** 클릭
4. **웹훅 추가** 버튼 클릭

### 웹훅 설정:
```
웹훅 URL: https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook

이벤트 선택:
☑️ 구독자 추가됨 (subscribe)
☑️ 구독 취소됨 (unsubscribe)

HTTP 메서드: POST
Content-Type: application/json
```

5. **저장** 버튼 클릭

### 웹훅 테스트:
1. 스티비에서 **웹훅 테스트** 버튼 클릭
2. Supabase Dashboard → Edge Functions → stibee-webhook → Logs 확인
3. 로그에 "🔔 Webhook received from Stibee" 메시지 확인

---

## 5단계: 기존 구독자 전체 동기화

### 터미널에서 수동 실행:
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
```

### 정상 응답:
```json
{
  "success": true,
  "totalFetched": 1500,
  "inserted": 1500,
  "errors": 0,
  "syncedAt": "2026-05-23T..."
}
```

### DB에서 확인:
```sql
-- 전체 구독자 수
SELECT COUNT(*) as total FROM stibee_subscribers;
-- 결과: 1500 (또는 실제 구독자 수)

-- 최근 동기화된 구독자 10명
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

---

## 6단계: 동작 확인

### 실시간 동기화 테스트:
1. 스티비에서 새로운 구독자 추가 (테스트 이메일)
2. **즉시** DB 확인:
```sql
SELECT * FROM stibee_subscribers 
WHERE email = 'test@example.com';
```
3. 결과: 바로 나타나야 함 (웹훅 동작)

### 자동 동기화 확인:
1. 1분 대기
2. Edge Functions → sync-stibee-subscribers → Logs 확인
3. "🔄 Starting Stibee subscriber sync..." 메시지 확인
4. 1분마다 자동 실행됨

---

## 동작 방식 요약

### 1. 실시간 동기화 (웹훅)
```
스티비에서 새 구독자 추가
    ↓
스티비가 웹훅 전송
    ↓
stibee-webhook Edge Function 실행
    ↓
DB에 즉시 저장
    ↓
웹사이트에서 바로 로그인 가능 ✅
```

### 2. 자동 동기화 (1분마다)
```
Cron Job (1분마다)
    ↓
sync-stibee-subscribers Edge Function 실행
    ↓
스티비 API에서 전체 구독자 조회
    ↓
DB에 upsert (추가/업데이트)
    ↓
누락된 구독자 보완 ✅
```

### 3. 로그인 시 체크
```
사용자 로그인 시도
    ↓
check-stibee-subscriber Edge Function 실행
    ↓
1차: DB에서 확인 (빠름)
    ↓
2차: DB에 없으면 스티비 API 직접 조회 (느림)
    ↓
구독자면 로그인 허용 ✅
```

---

## 문제 해결

### 문제 1: 웹훅이 작동하지 않음
**확인사항**:
1. 스티비 웹훅 URL이 정확한가?
2. Edge Function 로그에 "🔔 Webhook received" 메시지가 있는가?
3. 스티비에서 웹훅 테스트를 실행했는가?

**해결**:
- 스티비 웹훅 설정 재확인
- Edge Function 로그 확인
- 웹훅 URL 복사 시 공백 없는지 확인

### 문제 2: 1분마다 동기화가 실행되지 않음
**확인사항**:
```sql
-- Cron Job 상태 확인
SELECT * FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-1min';

-- Cron Job 실행 이력 확인
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-1min')
ORDER BY start_time DESC 
LIMIT 10;
```

**해결**:
- pg_net 확장 활성화 확인: `CREATE EXTENSION IF NOT EXISTS pg_net;`
- Cron Job 재생성

### 문제 3: 구독자가 동기화되지 않음
**확인사항**:
1. Edge Function 환경 변수 설정 확인
2. Stibee API 키와 리스트 ID 정확한가?
3. Edge Function 로그에 에러 메시지가 있는가?

**해결**:
- 환경 변수 재설정
- 수동 동기화 실행해서 로그 확인
- Stibee API 키 재발급

---

## 완료 체크리스트

- [ ] SQL 스크립트 실행 완료
- [ ] `stibee_subscribers` 테이블 생성 확인
- [ ] Cron Job 생성 확인 (1분마다)
- [ ] Edge Functions 3개 배포 완료
  - [ ] sync-stibee-subscribers
  - [ ] stibee-webhook
  - [ ] check-stibee-subscriber
- [ ] 모든 Edge Functions 환경 변수 설정
- [ ] 스티비 웹훅 설정 완료
- [ ] 웹훅 테스트 성공
- [ ] 기존 구독자 전체 동기화 완료
- [ ] DB에 구독자 데이터 확인
- [ ] 실시간 동기화 테스트 성공
- [ ] 1분 자동 동기화 확인

모든 체크리스트 완료 시 설정 완료! 🎉

---

## 유지보수

### 로그 확인:
- **웹훅 로그**: Edge Functions → stibee-webhook → Logs
- **자동 동기화 로그**: Edge Functions → sync-stibee-subscribers → Logs
- **로그인 체크 로그**: Edge Functions → check-stibee-subscriber → Logs

### 구독자 수 모니터링:
```sql
-- 전체 구독자 수
SELECT COUNT(*) FROM stibee_subscribers;

-- 오늘 추가된 구독자
SELECT COUNT(*) FROM stibee_subscribers 
WHERE DATE(created_at) = CURRENT_DATE;

-- 최근 1시간 동기화된 구독자
SELECT COUNT(*) FROM stibee_subscribers 
WHERE last_synced_at > NOW() - INTERVAL '1 hour';
```

---

## 추가 기능 (선택사항)

### Cron Job 주기 변경:
```sql
-- 기존 Cron Job 삭제
SELECT cron.unschedule('sync-stibee-subscribers-every-1min');

-- 30초마다 실행 (더 빠른 동기화)
SELECT cron.schedule(
  'sync-stibee-subscribers-every-30sec',
  '*/30 * * * * *',  -- 30초마다
  $$ ... $$
);

-- 5분마다 실행 (서버 부하 감소)
SELECT cron.schedule(
  'sync-stibee-subscribers-every-5min',
  '*/5 * * * *',  -- 5분마다
  $$ ... $$
);
```

---

이제 완벽한 실시간 동기화 시스템이 구축되었습니다! 🚀
