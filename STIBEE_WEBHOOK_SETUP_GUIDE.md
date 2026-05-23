# ✅ Stibee 웹훅 설정 가이드

## 🎉 stibee-webhook 함수 배포 완료!

**웹훅 URL:**
```
https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook
```

**테스트 결과:**
```json
{
  "success": true,
  "action": "subscribe",
  "email": "test@example.com"
}
```

---

## 📋 Stibee 대시보드 설정 방법

### 1. Stibee 로그인
https://stibee.com 접속 후 로그인

### 2. 웹훅 설정 페이지 이동
1. 좌측 메뉴에서 **설정** 클릭
2. **웹훅** 또는 **Webhook** 메뉴 찾기
3. 또는 **자동화** → **웹훅** 경로

### 3. 새 웹훅 추가
**웹훅 URL 입력:**
```
https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook
```

**이벤트 선택:**
- ✅ 구독 (Subscribe)
- ✅ 구독 취소 (Unsubscribe)

**주소록 선택:**
- 주소록 ID: `289942` 선택

### 4. 저장 및 테스트
1. **저장** 버튼 클릭
2. Stibee에서 제공하는 **테스트 전송** 기능 사용
3. 테스트 성공 확인

---

## 🔍 동작 확인 방법

### 방법 1: Stibee에서 테스트 구독자 추가
1. Stibee 대시보드 → 주소록
2. 테스트 이메일 추가 (예: `test123@example.com`)
3. 몇 초 후 Supabase DB 확인:

```sql
SELECT * FROM stibee_subscribers 
WHERE email = 'test123@example.com';
```

### 방법 2: Supabase 로그 확인
1. Supabase Dashboard 접속
2. Edge Functions → stibee-webhook
3. **Logs** 탭 클릭
4. 웹훅 호출 로그 확인

**정상 로그 예시:**
```
🔔 Webhook received from Stibee
📧 Processing email: test@example.com
➕ Subscribe event for: test@example.com
✅ Subscriber added/updated: test@example.com
```

---

## 🎯 전체 동기화 시스템 구조

```
Stibee
  ├─→ [실시간] Webhook → stibee-webhook Function → DB (즉시 반영)
  └─→ [백업] Cron 1분 → sync-stibee-subscribers Function → DB (전체 동기화)
                                                              ↓
                                                    check-stibee-subscriber
                                                              ↓
                                                        Frontend 로그인
```

### 동기화 방식
1. **실시간 (웹훅)**: 새 구독자 추가 시 즉시 DB 반영
2. **백업 (Cron)**: 1분마다 전체 구독자 동기화
3. **Fallback**: 로그인 시 DB 없으면 Stibee API 직접 조회

---

## 📊 모니터링

### DB 확인
```sql
-- 총 구독자 수
SELECT COUNT(*) FROM stibee_subscribers;

-- 최근 추가된 구독자 10명
SELECT email, subscribed_at, last_synced_at 
FROM stibee_subscribers 
ORDER BY subscribed_at DESC 
LIMIT 10;

-- 1분 이내 업데이트된 구독자 (Cron 작동 확인)
SELECT COUNT(*) 
FROM stibee_subscribers 
WHERE last_synced_at > NOW() - INTERVAL '1 minute';
```

### 웹훅 로그 확인
Supabase Dashboard → Edge Functions → stibee-webhook → Logs

### Cron Job 확인
Supabase Dashboard → Database → Cron Jobs → `sync-stibee-subscribers-cron`

---

## 🔧 문제 해결

### 웹훅이 작동하지 않는 경우

**1. URL 확인**
- 정확한 URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook`
- 끝에 `/` 없음
- `https://` 포함

**2. Stibee 웹훅 로그 확인**
- Stibee 대시보드에서 웹훅 전송 기록 확인
- 실패 시 에러 메시지 확인

**3. Supabase 함수 로그 확인**
- Edge Functions → stibee-webhook → Logs
- 에러 메시지 확인

**4. 수동 테스트**
PowerShell에서 직접 테스트:
```powershell
$testData = @{ email = "test@example.com"; eventType = "subscribe" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"} -Body $testData -ContentType 'application/json' -UseBasicParsing
```

---

## ✅ 완료 체크리스트

- [x] `stibee-webhook` 함수 배포
- [x] 함수 테스트 성공
- [ ] Stibee 웹훅 URL 설정
- [ ] Stibee 이벤트 선택 (구독, 구독 취소)
- [ ] 테스트 구독자 추가
- [ ] DB 반영 확인
- [ ] 로그 확인

---

## 🎉 최종 결과

**구현 완료:**
- ✅ DB 테이블 생성
- ✅ sync-stibee-subscribers 배포 (1,776명 동기화)
- ✅ stibee-webhook 배포
- ✅ 1분 Cron Job 설정
- ✅ check-stibee-subscriber 환경 변수

**남은 작업:**
- ⏳ Stibee 웹훅 URL 설정 (사용자가 직접)
- ⏳ 실시간 동기화 테스트

**시스템 상태:**
- 전체 구독자: 1,776명
- 자동 동기화: 1분마다
- 실시간 웹훅: 배포 완료 (설정 대기)
