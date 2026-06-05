# GA4 BigQuery 링크 vs Data API 권한 차이

## 🚨 핵심 문제

**BigQuery 링크 ≠ GA4 Data API 접근 권한**

사용자는 GCP에서:
- ✅ Service Account에 "소유자" 권한 부여함
- ✅ BigQuery 링크 확인됨
- ❌ 하지만 GA4 Data API는 **별도의 권한**이 필요함

---

## 📊 BigQuery 링크 vs Data API

| 항목 | BigQuery 링크 | Data API 접근 |
|------|--------------|---------------|
| **목적** | GA4 → BigQuery 데이터 내보내기 | 실시간 GA4 데이터 읽기 |
| **설정 위치** | GA4 → 제품 링크 → BigQuery | GA4 → 속성 액세스 관리 |
| **필요 권한** | GCP BigQuery 권한 | GA4 속성 뷰어 권한 |
| **API** | BigQuery API | Google Analytics Data API |

---

## ✅ 해결 방법

### 방법 1: GA4에서 Google Cloud 링크 생성 (추천)

GA4 속성과 GCP 프로젝트를 연결하면, GCP의 Service Account가 자동으로 GA4 Data API에 접근할 수 있습니다.

1. **GA4 접속:** https://analytics.google.com/
2. **관리 (좌측 하단 ⚙️)** 클릭
3. **속성** 열에서 **"제품 링크"** 찾기
   - 스크롤을 아래로 내리면 **"Google Cloud 링크"** 항목이 있습니다
   - **BigQuery 링크 아래에 있을 수 있습니다**
4. **"Google Cloud 링크"** 클릭
5. **"링크 추가"** 또는 **"프로젝트 선택"** 클릭
6. GCP 프로젝트 선택:
   ```
   hokex-498415
   ```
7. **"확인"** 또는 **"링크"** 클릭

이렇게 하면:
- GCP 프로젝트의 **모든 Service Account**가 GA4 Data API에 접근 가능
- 별도로 Service Account를 GA4 속성 액세스 관리에 추가할 필요 없음

---

### 방법 2: GA4 속성 액세스 관리에서 직접 추가 (재시도)

**Service Account 이메일 정확히 확인:**

GCP IAM 스크린샷에서 보이는 이메일:
```
hokex-analytics@hokex-498415.iam.gserviceaccount.com
```

**GA4에 추가:**
1. https://analytics.google.com/
2. 관리 → 속성 → **"속성 액세스 관리"**
3. 오른쪽 상단 **"추가"** (+ 버튼)
4. **이메일 주소 입력:**
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
   - **주의:** 공백이나 오타가 없도록 복사-붙여넣기
5. **역할 선택:**
   - ✅ "뷰어"
6. **"알림 없이 추가"** 선택 (경고가 나타나도 무시)
7. **"추가"** 클릭

**확인:**
- 속성 액세스 관리 페이지로 돌아가서
- Service Account 이메일이 **목록에 나타나는지** 확인
- **나타나지 않으면 → 추가 실패 → 방법 1 시도**

---

### 방법 3: Google Cloud Console에서 직접 권한 부여

**Google Cloud Console의 IAM 페이지에서 GA4 관련 역할 추가:**

1. https://console.cloud.google.com/iam-admin/iam?project=hokex-498415
2. Service Account 찾기:
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
3. **"수정"** (연필 아이콘) 클릭
4. **"다른 역할 추가"** 클릭
5. 다음 역할 추가:
   - **"BigQuery 데이터 뷰어"**
   - **"BigQuery 작업 사용자"**
6. **"저장"** 클릭

**그 다음, 방법 1 시도 (Google Cloud 링크)**

---

## 🔍 진단: 어디서 막혔는지 확인

### 체크리스트

- [ ] **1. GCP Service Account 존재 확인**
  - https://console.cloud.google.com/iam-admin/serviceaccounts?project=hokex-498415
  - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 있음?

- [ ] **2. GA4 Data API 활성화 확인**
  - https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=hokex-498415
  - "사용 설정됨" 상태?

- [ ] **3. GA4 Google Cloud 링크 확인**
  - GA4 → 관리 → 제품 링크 → Google Cloud 링크
  - `hokex-498415` 프로젝트 연결됨?

- [ ] **4. GA4 속성 ID 확인**
  - GA4 → 관리 → 속성 → 속성 설정
  - 속성 ID: `538348093`?

- [ ] **5. Service Account 키 확인**
  - Supabase 환경변수 `GA_SERVICE_ACCOUNT_KEY`에 정확한 JSON 설정됨?

---

## 🧪 테스트

권한 설정 후 **5-10분 대기**, 그 다음:

### Supabase Edge Function 테스트
1. https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/functions
2. `get-ga-stats` 클릭
3. **"Invoke function"** 실행
4. 로그 확인:
   - ✅ 성공: 데이터 반환
   - ❌ 403: 여전히 권한 문제

---

## 💡 추천 순서

1. **방법 1: Google Cloud 링크 생성** (가장 쉬움)
   - GA4와 GCP 프로젝트를 직접 연결
   - Service Account 자동 권한 부여

2. 5-10분 대기

3. **Edge Function 테스트**

4. 여전히 안 되면 **방법 2 재시도**
   - Service Account 이메일 정확히 복사
   - "알림 없이 추가" 선택

5. 최후: **방법 3** (GCP IAM에서 BigQuery 역할 추가)

---

## 📸 확인해야 할 스크린샷

다음을 스크린샷으로 확인해주세요:

1. **GA4 → 관리 → 제품 링크**
   - "Google Cloud 링크" 항목이 있나요?
   - 있다면, `hokex-498415` 프로젝트가 연결되어 있나요?

2. **GA4 → 관리 → 속성 설정**
   - 속성 ID가 `538348093`이 맞나요?

3. **GCP → Analytics Data API**
   - https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=hokex-498415
   - "사용 설정됨" 상태인가요?

---

## 🆘 여전히 안 되는 경우

**다음 정보 필요:**
1. GA4 제품 링크 페이지 스크린샷
2. GA4 속성 ID 스크린샷
3. GCP Analytics Data API 상태 스크린샷
4. Edge Function 로그 (Supabase에서 Invoke 실행 후)
