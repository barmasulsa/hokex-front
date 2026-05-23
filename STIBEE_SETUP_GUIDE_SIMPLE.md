# 🚀 스티비 구독자 동기화 설정 가이드 (처음부터)

## 현재 상황
- ✅ 기존 스티비 관련 설정 모두 삭제 완료
- ✅ Edge Functions 코드 준비 완료
- 🔄 새로 설정 시작

---

## 1단계: SQL 스크립트 실행

### Supabase Dashboard에서:
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (qmhxnxnaawtjelqlgyig)
3. 왼쪽 메뉴: **SQL Editor** 클릭
4. **New query** 클릭
5. `hokex-front/setup-stibee-from-scratch.sql` 파일 내용 복사 & 붙여넣기
6. **Run** 버튼 클릭

### 실행 결과 확인:
```sql
-- 테이블 생성 확인
SELECT COUNT(*) FROM stibee_subscribers;
-- 결과: 0 (아직 구독자 없음)

-- Cron Job 생성 확인
SELECT * FROM cron.job WHERE jobname = 'sync-stibee-subscribers-every-5min';
-- 결과: 1개 행 (Cron Job 생성됨)
```

---

## 2단계: Edge Functions 환경 변수 설정

### sync-stibee-subscribers 함수:
1. Supabase Dashboard → **Edge Functions** 클릭
2. `sync-stibee-subscribers` 함수 클릭
3. **Settings** 탭 클릭
4. **Secrets** 섹션에서 **Add secret** 클릭
5. 다음 2개 변수 추가:

```
Name: STIBEE_API_KEY
Value: [Stibee 대시보드에서 발급받은 API 키]

Name: STIBEE_LIST_ID
Value: [Stibee 리스트 ID]
```

### check-stibee-subscriber 함수:
1. `check-stibee-subscriber` 함수 클릭
2. **Settings** 탭 클릭
3. **Secrets** 섹션에서 동일하게 추가:

```
Name: STIBEE_API_KEY
Value: [동일한 API 키]

Name: STIBEE_LIST_ID
Value: [동일한 리스트 ID]
```

---

## 3단계: Stibee API 키와 리스트 ID 확인 방법

### API 키 확인:
1. https://stibee.com 접속 및 로그인
2. 오른쪽 상단 프로필 → **설정** 클릭
3. 왼쪽 메뉴: **API** 클릭
4. **API 키** 복사

### 리스트 ID 확인:
1. Stibee 대시보드 → **주소록** 클릭
2. 사용 중인 주소록 클릭
3. 브라우저 주소창 URL 확인:
   ```
   https://stibee.com/lists/[여기가 리스트 ID]/subscribers
   ```
4. 또는 주소록 설정에서 확인 가능

---

## 4단계: 수동 동기화 테스트

### 터미널에서 실행:
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

### 에러 응답:
```json
{
  "error": "Server configuration error"
}
```
→ 환경 변수가 설정되지 않음. 2단계로 돌아가서 확인

---

## 5단계: DB에서 구독자 확인

### Supabase SQL Editor에서:
```sql
-- 전체 구독자 수
SELECT COUNT(*) as total FROM stibee_subscribers;

-- 최근 동기화된 구독자 10명
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

---

## 6단계: Edge Function 로그 확인

### Supabase Dashboard에서:
1. **Edge Functions** → `sync-stibee-subscribers` → **Logs** 탭
2. 최근 실행 로그 확인

### 정상 로그:
```
🔄 Starting Stibee subscriber sync...
📡 Fetching offset 0 (iteration 1)...
📊 Offset 0: 1000 subscribers
📡 Fetching offset 1000 (iteration 2)...
📊 Offset 1000: 500 subscribers
✅ Offset 1000 returned 500 subscribers (less than limit), this is the last batch
📊 Total subscribers fetched: 1500
💾 Upserting 1500 subscribers to DB...
✅ Sync completed: 1500 inserted, 0 errors
```

---

## 7단계: 자동 동기화 확인

- Cron Job이 5분마다 자동으로 실행됩니다
- 새로운 구독자가 Stibee에 추가되면 5분 이내에 DB에 동기화됩니다
- 로그인 시도 시 DB에 없으면 Stibee API를 직접 조회합니다

---

## 문제 해결

### 문제 1: "Server configuration error"
**원인**: 환경 변수 미설정  
**해결**: 2단계로 돌아가서 `STIBEE_API_KEY`와 `STIBEE_LIST_ID` 설정

### 문제 2: "Failed to fetch subscribers from Stibee"
**원인**: API 키 또는 리스트 ID 오류  
**해결**: 3단계에서 올바른 값 확인 후 재설정

### 문제 3: 구독자가 0명으로 나옴
**원인**: Stibee API 응답 구조 불일치  
**해결**: Edge Function 로그 확인 후 코드 수정 필요

### 문제 4: Cron Job이 실행되지 않음
**원인**: pg_net 확장 미활성화  
**해결**: SQL Editor에서 `CREATE EXTENSION IF NOT EXISTS pg_net;` 실행

---

## 완료 체크리스트

- [ ] SQL 스크립트 실행 완료
- [ ] `stibee_subscribers` 테이블 생성 확인
- [ ] Cron Job 생성 확인
- [ ] `sync-stibee-subscribers` 환경 변수 설정
- [ ] `check-stibee-subscriber` 환경 변수 설정
- [ ] 수동 동기화 테스트 성공
- [ ] DB에 구독자 데이터 확인
- [ ] Edge Function 로그 정상 확인

모든 체크리스트 완료 시 설정 완료! 🎉

---

## 다음 단계

설정 완료 후:
1. 웹사이트에서 로그인 테스트
2. 새로운 구독자 추가 후 5분 대기
3. 로그인 가능 여부 확인

문제 발생 시 Edge Function 로그를 먼저 확인하세요!
