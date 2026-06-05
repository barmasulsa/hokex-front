# GA4 권한 문제 진단 가이드

## 🔍 현재 상황
- Service Account를 GA4에 추가하려고 시도했으나 경고가 발생
- 경고를 무시하고 진행했지만 실제로는 추가되지 않았을 가능성
- 403 PERMISSION_DENIED 에러 계속 발생

## 🎯 가능한 원인 3가지

### 1. Service Account가 실제로 추가되지 않음 (가장 가능성 높음)
**증상:**
- GA4 UI에서 "이메일이 Google 계정과 일치하지 않습니다" 경고
- "추가" 버튼을 눌렀지만 실제로는 등록되지 않음
- 속성 액세스 관리 목록에 Service Account가 없음

**해결:**
- GA4 → 관리 → 속성 액세스 관리 → **목록을 다시 확인**
- Service Account가 목록에 있는지 스크린샷으로 확인 필요

### 2. 다른 GA4 속성에 권한을 추가함
**증상:**
- 여러 개의 GA4 속성이 있는 경우
- 잘못된 속성에 Service Account를 추가함

**확인:**
```
현재 코드에서 사용 중인 Property ID: 538348093
```

**확인 방법:**
1. GA4 접속: https://analytics.google.com/
2. 왼쪽 상단에서 현재 선택된 속성 확인
3. 관리 → 속성 → 속성 설정 → **속성 ID 확인**
4. 이 ID가 `538348093`인지 확인
5. 만약 다르다면, 올바른 속성으로 전환 후 Service Account 추가

### 3. Google Analytics Data API가 활성화되지 않음
**증상:**
- Service Account는 정상 추가됨
- 하지만 GCP 프로젝트에서 API가 비활성화됨

**확인:**
1. GCP 콘솔 접속: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=hokex-498415
2. **"Google Analytics Data API"** 찾기
3. "사용 설정됨" 상태인지 확인
4. 만약 "사용 설정" 버튼이 보이면 클릭

---

## 🧪 단계별 진단

### Step 1: Service Account 이메일 재확인
```
hokex-analytics@hokex-498415.iam.gserviceaccount.com
```

**GCP에서 확인:**
https://console.cloud.google.com/iam-admin/serviceaccounts?project=hokex-498415

- 이 Service Account가 목록에 있나요?
- 이메일 주소가 정확히 일치하나요?

### Step 2: GA4 속성 ID 재확인
```
현재 설정: 538348093
```

**GA4에서 확인:**
1. https://analytics.google.com/ 접속
2. 관리 → 속성 → 속성 설정
3. 페이지 상단의 "속성 ID" 확인
4. **스크린샷 찍어서 확인**

### Step 3: Service Account 권한 재확인
**GA4에서 확인:**
1. 관리 → 속성 액세스 관리
2. **목록을 스크롤해서 Service Account 찾기**
3. Service Account가 있나요?
   - ✅ **있음**: Step 4로
   - ❌ **없음**: 아래 "확실한 추가 방법" 참고

### Step 4: API 활성화 확인
**GCP에서 확인:**
https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=hokex-498415

- "사용 설정됨" 상태인가요?
- "사용 설정" 버튼이 보이나요?

---

## ✅ Service Account를 확실하게 추가하는 방법

### 방법 1: GA4 UI에서 다시 시도 (권장)
1. https://analytics.google.com/ 접속
2. **왼쪽 상단에서 속성 선택** → Property ID `538348093` 확인
3. 관리 → 속성 액세스 관리
4. 오른쪽 상단 **"추가"** 버튼
5. **이메일 주소 입력:**
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
6. **역할 선택:**
   - ✅ "뷰어" 체크
7. **경고가 나타나면:**
   - "Google 계정이 아닙니다" 경고 무시
   - **"알림 없이 추가" 또는 "직접 추가"** 선택
   - 또는 **경고를 무시하고 "추가" 버튼 클릭**
8. **확인:**
   - 속성 액세스 관리 페이지로 돌아감
   - **목록에서 Service Account 이메일이 보이는지 확인**
   - 보이지 않으면 추가 실패 → 방법 2 시도

### 방법 2: Organization 또는 Account 레벨에서 추가
만약 속성 레벨에서 추가가 안 되면:

1. 관리 → **계정 액세스 관리** (속성이 아닌 계정)
2. Service Account 추가 시도
3. 역할: "뷰어"

### 방법 3: 다른 이메일로 초대 후 Service Account에 권한 위임
1. 다른 Google 계정으로 초대
2. 해당 계정으로 로그인
3. Service Account에 권한 부여

---

## 🔧 임시 해결책: Supabase에서 직접 테스트

Edge Function을 Supabase Dashboard에서 직접 호출해보세요:

1. Supabase Dashboard 접속: https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig
2. Edge Functions → `get-ga-stats`
3. **"Invoke function"** 클릭
4. 파라미터: `?region=both`
5. 로그에서 정확한 에러 메시지 확인

---

## 📸 필요한 스크린샷

다음 내용을 스크린샷으로 찍어서 확인해주세요:

1. **GA4 속성 설정 페이지**
   - 속성 ID가 보이는 화면

2. **GA4 속성 액세스 관리 페이지**
   - Service Account가 목록에 있는지 확인
   - 전체 목록을 스크롤해서 확인

3. **GCP Analytics Data API 페이지**
   - "사용 설정됨" 상태 확인

---

## 💡 다음 단계

1. **위의 Step 1~4를 순서대로 확인**
2. **Service Account가 목록에 없으면 → "방법 1"로 다시 추가**
3. **5-10분 대기 후 테스트**
4. **여전히 안 되면 → 스크린샷 공유**

---

## 🆘 여전히 안 되는 경우

다음 정보를 확인해주세요:

1. GA4 속성 ID 스크린샷
2. 속성 액세스 관리 목록 스크린샷
3. GCP Service Account 목록 스크린샷
4. Analytics Data API 활성화 상태 스크린샷
5. Edge Function 로그 (Supabase Dashboard에서 Invoke 실행 후)
