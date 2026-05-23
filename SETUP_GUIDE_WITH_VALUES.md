# 🚀 스티비 실시간 동기화 설정 가이드 (실제 값 포함)

## ✅ 1단계: SQL 실행 완료
- 테이블 생성 ✅
- Cron Job 생성 (1분마다) ✅

---

## 📋 2단계: Supabase Dashboard에서 환경 변수 설정

### 접속 방법:
1. https://supabase.com/dashboard 접속
2. 프로젝트 `qmhxnxnaawtjelqlgyig` 선택
3. 왼쪽 메뉴에서 **Edge Functions** 클릭 (번개 모양 아이콘)

### 설정할 함수 3개:

#### 함수 1: `sync-stibee-subscribers`
1. 함수 목록에서 `sync-stibee-subscribers` 클릭
2. 상단 탭에서 **Settings** 클릭
3. 아래로 스크롤 → **Secrets** 섹션
4. **Add new secret** 버튼 클릭
5. 다음 2개 추가:

```
Name: STIBEE_API_KEY
Value: api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
```

```
Name: STIBEE_LIST_ID
Value: 289942
```

#### 함수 2: `check-stibee-subscriber`
1. 함수 목록에서 `check-stibee-subscriber` 클릭
2. **Settings** → **Secrets**
3. 동일한 2개 추가:

```
Name: STIBEE_API_KEY
Value: api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
```

```
Name: STIBEE_LIST_ID
Value: 289942
```

#### 함수 3: `stibee-webhook`
1. 함수 목록에서 `stibee-webhook` 클릭
2. **Settings** → **Secrets**
3. 동일한 2개 추가:

```
Name: STIBEE_API_KEY
Value: api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
```

```
Name: STIBEE_LIST_ID
Value: 289942
```

---

## 📋 3단계: 스티비 웹훅 설정

### 방법:
1. https://stibee.com 접속 및 로그인
2. 왼쪽 메뉴: **주소록** 클릭
3. 리스트 ID `289942` 주소록 선택
4. 왼쪽 메뉴: **설정** → **웹훅** 클릭
5. **웹훅 추가** 버튼 클릭

### 웹훅 설정 값:
```
웹훅 URL: 
https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook

이벤트 선택:
☑️ 구독자 추가됨
☑️ 구독 취소됨

HTTP 메서드: POST
Content-Type: application/json
```

6. **저장** 클릭

---

## 📋 4단계: 기존 구독자 전체 동기화

### Windows PowerShell에서 실행:
```powershell
Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

### 또는 Git Bash에서 실행:
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
```

---

## 📋 5단계: 확인

### Supabase SQL Editor에서 실행:
```sql
-- 전체 구독자 수 확인
SELECT COUNT(*) as total FROM stibee_subscribers;

-- 최근 구독자 10명 확인
SELECT email, last_synced_at 
FROM stibee_subscribers 
ORDER BY last_synced_at DESC 
LIMIT 10;

-- 테스트 이메일 확인
SELECT * FROM stibee_subscribers 
WHERE email = 'lcw7914875@gmail.com';
```

---

## ✅ 완료 체크리스트

- [x] 1단계: SQL 스크립트 실행 완료
- [ ] 2단계: 3개 Edge Functions에 환경 변수 설정
  - [ ] sync-stibee-subscribers
  - [ ] check-stibee-subscriber
  - [ ] stibee-webhook
- [ ] 3단계: 스티비 웹훅 설정
- [ ] 4단계: 기존 구독자 동기화 실행
- [ ] 5단계: DB에서 구독자 확인

---

## 💡 다음 단계

**지금 해야 할 것:**
1. Supabase Dashboard 접속
2. Edge Functions → 각 함수에 환경 변수 2개씩 추가
3. 완료되면 알려주세요!

그럼 다음 단계(웹훅 설정)로 진행하겠습니다.
