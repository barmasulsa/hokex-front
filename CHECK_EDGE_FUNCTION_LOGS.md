# Edge Function 로그 확인 가이드

## 문제 상황
- DB에 구독자가 10명만 있음
- 예상: 1500명 이상
- Edge Function이 제대로 작동하는지 확인 필요

## 1단계: Edge Function 로그 확인

### Supabase Dashboard에서 확인:
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (qmhxnxnaawtjelqlgyig)
3. 왼쪽 메뉴에서 **Edge Functions** 클릭
4. `sync-stibee-subscribers` 함수 클릭
5. **Logs** 탭 클릭

### 확인할 내용:
```
✅ 정상 로그 예시:
📡 Fetching offset 0 (iteration 1)...
📊 Offset 0: 1000 subscribers
📡 Fetching offset 1000 (iteration 2)...
📊 Offset 1000: 500 subscribers
✅ Offset 1000 returned 500 subscribers (less than limit), this is the last batch
📊 Total subscribers fetched: 1500
💾 Upserting 1500 subscribers to DB...

❌ 문제 로그 예시:
📡 Fetching offset 0 (iteration 1)...
📊 Offset 0: 10 subscribers
⚠️ Offset 0 returned no subscribers, stopping...
📊 Total subscribers fetched: 10
```

## 2단계: 환경 변수 확인

### Supabase Dashboard에서 확인:
1. **Edge Functions** → `sync-stibee-subscribers` → **Settings** 탭
2. 다음 환경 변수가 설정되어 있는지 확인:
   - `STIBEE_API_KEY`: Stibee API 키
   - `STIBEE_LIST_ID`: Stibee 리스트 ID

### 환경 변수가 없다면:
1. **Settings** 탭에서 **Add secret** 클릭
2. 다음 변수 추가:
   ```
   Name: STIBEE_API_KEY
   Value: [Stibee에서 발급받은 API 키]
   
   Name: STIBEE_LIST_ID
   Value: [Stibee 리스트 ID]
   ```

## 3단계: 수동으로 Edge Function 실행

### 터미널에서 실행:
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
```

### 응답 확인:
```json
{
  "success": true,
  "totalFetched": 1500,
  "inserted": 1500,
  "errors": 0,
  "syncedAt": "2026-05-23T..."
}
```

## 4단계: DB에서 구독자 수 확인

### Supabase SQL Editor에서 실행:
```sql
SELECT COUNT(*) as total_subscribers 
FROM stibee_subscribers;

-- 최근 동기화된 구독자 확인
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

## 가능한 문제와 해결책

### 문제 1: 환경 변수 미설정
**증상**: 로그에 "❌ Stibee API credentials not configured" 에러
**해결**: 2단계에서 환경 변수 추가

### 문제 2: Stibee API 키 또는 리스트 ID 오류
**증상**: 로그에 "❌ Stibee API error: 401" 또는 "404"
**해결**: Stibee 대시보드에서 올바른 API 키와 리스트 ID 확인

### 문제 3: Stibee API 응답 구조 불일치
**증상**: 로그에 "📊 Offset 0: 0 subscribers" (실제로는 구독자가 있는데)
**해결**: Stibee API 응답 구조 확인 필요 (다음 가이드 참조)

### 문제 4: Edge Function 타임아웃
**증상**: 로그가 중간에 끊김
**해결**: Supabase Edge Function 타임아웃 설정 확인 (기본 60초)

## 다음 단계

로그를 확인한 후 결과를 알려주세요:
1. 로그에 어떤 메시지가 나오는지
2. 환경 변수가 설정되어 있는지
3. 수동 실행 시 응답이 어떻게 나오는지
