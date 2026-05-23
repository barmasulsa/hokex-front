# 다음 단계 (간단 가이드)

## ✅ 완료된 것
- 1단계: SQL 스크립트 실행 (테이블, Cron Job 생성)

---

## 🔄 지금 해야 할 것

### 2단계: Supabase Dashboard에서 환경 변수 설정

#### 방법:
1. **Supabase Dashboard 접속**: https://supabase.com/dashboard
2. 프로젝트 선택: `qmhxnxnaawtjelqlgyig`
3. 왼쪽 메뉴에서 **Edge Functions** 클릭
4. 각 함수마다 환경 변수 추가:

#### 설정할 함수 3개:
1. `sync-stibee-subscribers`
2. `check-stibee-subscriber`  
3. `stibee-webhook` (새로 만든 것 - 아직 배포 안 됨)

#### 각 함수에 추가할 환경 변수:
- 함수 클릭 → **Settings** 탭 → **Secrets** 섹션
- **Add secret** 버튼 클릭
- 다음 2개 추가:

```
Name: STIBEE_API_KEY
Value: [스티비에서 발급받은 API 키]

Name: STIBEE_LIST_ID
Value: [스티비 리스트 ID]
```

---

### 3단계: 스티비 API 키와 리스트 ID 확인

#### API 키 확인:
1. https://stibee.com 접속 및 로그인
2. 오른쪽 상단 프로필 → **설정**
3. 왼쪽 메뉴: **API**
4. API 키 복사

#### 리스트 ID 확인:
1. 스티비 대시보드 → **주소록**
2. 사용 중인 주소록 클릭
3. 브라우저 주소창 URL 확인:
   ```
   https://stibee.com/lists/[여기가 리스트 ID]/subscribers
   ```

---

### 4단계: 스티비 웹훅 설정

#### 방법:
1. 스티비 대시보드 → 주소록 선택
2. 왼쪽 메뉴: **설정** → **웹훅**
3. **웹훅 추가** 버튼 클릭
4. 다음 입력:

```
웹훅 URL: 
https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook

이벤트 선택:
☑️ 구독자 추가됨
☑️ 구독 취소됨

HTTP 메서드: POST
Content-Type: application/json
```

5. **저장** 클릭

---

### 5단계: 기존 구독자 동기화 (수동 실행)

#### Windows PowerShell에서:
```powershell
Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

#### 또는 Git Bash에서:
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
```

---

### 6단계: 확인

#### Supabase SQL Editor에서:
```sql
-- 구독자 수 확인
SELECT COUNT(*) FROM stibee_subscribers;

-- 최근 구독자 10명 확인
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

---

## 📝 요약

1. ✅ SQL 실행 완료
2. ⏳ Supabase Dashboard에서 환경 변수 설정 (3개 함수)
3. ⏳ 스티비에서 API 키, 리스트 ID 확인
4. ⏳ 스티비 웹훅 설정
5. ⏳ 수동 동기화 실행
6. ⏳ DB 확인

---

## 💡 참고

- **1분마다 자동 동기화**: Cron Job이 이미 설정되어 있어서 1분마다 자동으로 실행됩니다
- **실시간 동기화**: 웹훅 설정 후 새 구독자가 추가되면 즉시 DB에 반영됩니다
- **문제 발생 시**: Edge Functions → Logs 탭에서 로그 확인

지금은 **2단계(환경 변수 설정)**부터 시작하시면 됩니다!
