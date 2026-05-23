# 🔍 구독자 10명만 동기화되는 문제 진단 가이드

## 현재 상황
- ✅ Cron Job 생성 완료 (5분마다 자동 실행)
- ✅ Edge Function 배포 완료
- ❌ **문제**: DB에 구독자가 10명만 있음 (예상: 1500명 이상)

## 진단 순서

### 1단계: Stibee API 키와 리스트 ID 확인

#### 방법 1: Supabase Dashboard에서 확인
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (qmhxnxnaawtjelqlgyig)
3. 왼쪽 메뉴: **Edge Functions** 클릭
4. `sync-stibee-subscribers` 함수 클릭
5. **Settings** 탭 클릭
6. **Secrets** 섹션에서 다음 확인:
   - `STIBEE_API_KEY` 설정되어 있는가?
   - `STIBEE_LIST_ID` 설정되어 있는가?

#### 방법 2: 브라우저에서 API 응답 테스트
1. `hokex-front/test-stibee-api-response.html` 파일을 브라우저로 열기
2. Stibee API Key와 List ID 입력
3. "API 응답 확인" 버튼 클릭
4. 결과 확인:
   - ✅ 성공: 구독자 목록과 전체 수 표시
   - ❌ 실패: 에러 메시지 확인 (401, 404 등)

### 2단계: Edge Function 로그 확인

#### Supabase Dashboard에서 로그 보기:
1. **Edge Functions** → `sync-stibee-subscribers` → **Logs** 탭
2. 최근 실행 로그 확인

#### 정상 로그 예시:
```
🔄 Starting Stibee subscriber sync...
📡 Fetching offset 0 (iteration 1)...
📊 Offset 0: 1000 subscribers
📡 Fetching offset 1000 (iteration 2)...
📊 Offset 1000: 500 subscribers
✅ Offset 1000 returned 500 subscribers (less than limit), this is the last batch
📊 Total subscribers fetched: 1500
💾 Upserting 1500 subscribers to DB...
✅ Batch 1 inserted: 500 records
✅ Batch 2 inserted: 500 records
✅ Batch 3 inserted: 500 records
✅ Sync completed: 1500 inserted, 0 errors
```

#### 문제 로그 예시:
```
❌ Stibee API credentials not configured
→ 환경 변수가 설정되지 않음

❌ Stibee API error: 401
→ API Key가 잘못됨

📊 Offset 0: 10 subscribers
⚠️ Offset 0 returned no subscribers, stopping...
→ API 응답 구조 문제 또는 실제로 10명만 있음
```

### 3단계: 수동으로 Edge Function 실행

#### 터미널에서 실행:
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
```

#### 정상 응답:
```json
{
  "success": true,
  "totalFetched": 1500,
  "inserted": 1500,
  "errors": 0,
  "syncedAt": "2026-05-23T..."
}
```

#### 에러 응답:
```json
{
  "error": "Server configuration error"
}
→ 환경 변수 미설정

{
  "error": "Failed to fetch subscribers from Stibee"
}
→ Stibee API 호출 실패
```

### 4단계: DB에서 구독자 수 확인

#### Supabase SQL Editor에서 실행:
```sql
-- 전체 구독자 수
SELECT COUNT(*) as total_subscribers 
FROM stibee_subscribers;

-- 최근 동기화된 구독자 10명
SELECT email, subscribed_at, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;

-- 동기화 시간별 분포
SELECT 
  DATE_TRUNC('minute', last_synced_at) as sync_time,
  COUNT(*) as count
FROM stibee_subscribers
GROUP BY sync_time
ORDER BY sync_time DESC;
```

## 가능한 문제와 해결책

### 문제 1: 환경 변수 미설정 ⚙️
**증상**: 
- 로그에 "❌ Stibee API credentials not configured"
- 또는 Edge Function이 실행되지 않음

**해결**:
1. Supabase Dashboard → Edge Functions → sync-stibee-subscribers → Settings
2. **Add secret** 클릭
3. 다음 변수 추가:
   ```
   Name: STIBEE_API_KEY
   Value: [Stibee API 키]
   
   Name: STIBEE_LIST_ID
   Value: [Stibee 리스트 ID]
   ```
4. Edge Function 재시작 (자동으로 재시작됨)

### 문제 2: Stibee API 키 또는 리스트 ID 오류 🔑
**증상**:
- 로그에 "❌ Stibee API error: 401" (인증 실패)
- 로그에 "❌ Stibee API error: 404" (리스트 없음)

**해결**:
1. Stibee 대시보드 접속 (https://stibee.com)
2. **설정** → **API** 메뉴에서 API 키 확인
3. **주소록** 메뉴에서 리스트 ID 확인 (URL에서 확인 가능)
4. Supabase에서 환경 변수 업데이트

### 문제 3: Stibee에 실제로 10명만 있음 👥
**증상**:
- 로그에 "📊 Total subscribers fetched: 10"
- Stibee 대시보드에서도 10명만 보임

**해결**:
- 이 경우 정상입니다. Stibee에 구독자를 추가하면 자동으로 동기화됩니다.
- 5분마다 자동 동기화되므로 기다리거나 수동 실행하세요.

### 문제 4: Stibee API 응답 구조 불일치 📊
**증상**:
- 로그에 "📊 Offset 0: 0 subscribers" (실제로는 있는데)
- `test-stibee-api-response.html`에서 "알 수 없는 구조" 표시

**해결**:
1. `test-stibee-api-response.html`로 실제 응답 구조 확인
2. Edge Function 코드 수정 필요 (응답 구조에 맞게)
3. 수정 후 재배포

### 문제 5: Edge Function 타임아웃 ⏱️
**증상**:
- 로그가 중간에 끊김
- "📡 Fetching offset 1000..." 이후 로그 없음

**해결**:
- Supabase Edge Function은 기본 60초 타임아웃
- 구독자가 너무 많으면 타임아웃 발생 가능
- 해결: BATCH_SIZE를 줄이거나 MAX_ITERATIONS 조정

## 다음 단계

위 진단을 완료한 후 다음 정보를 알려주세요:

1. **환경 변수 설정 여부**:
   - [ ] STIBEE_API_KEY 설정됨
   - [ ] STIBEE_LIST_ID 설정됨

2. **Edge Function 로그 내용**:
   - 어떤 에러 메시지가 나오는가?
   - "Total subscribers fetched: X" 에서 X는 몇인가?

3. **Stibee API 테스트 결과** (`test-stibee-api-response.html`):
   - API 호출 성공했는가?
   - 전체 구독자 수는 몇 명인가?
   - 응답 구조는 무엇인가?

4. **수동 실행 결과**:
   - curl 명령어 실행 시 응답은?

이 정보를 바탕으로 정확한 해결책을 제시하겠습니다! 🚀
