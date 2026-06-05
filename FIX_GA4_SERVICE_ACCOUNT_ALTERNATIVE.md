# GA4 Service Account 추가가 안 될 때 해결 방법

## 🚨 문제 상황
- GA4 UI에서 Service Account 추가 시 경고 발생
- 경고를 무시해도 추가가 되지 않음
- 403 PERMISSION_DENIED 에러 계속 발생

---

## ✅ 해결 방법 1: Google Cloud Console에서 직접 권한 부여

### 1단계: Google Cloud Console에서 IAM 설정
1. https://console.cloud.google.com/iam-admin/iam?project=hokex-498415 접속
2. **"권한 부여"** 버튼 클릭
3. **새 주 구성원:**
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
4. **역할 선택:**
   - "Viewer" (뷰어) 검색
   - **또는** "BigQuery Data Viewer" 선택
5. **"저장"** 클릭

### 2단계: GA4 속성 연결 (Google Admin Console)
GA4와 GCP 프로젝트가 연결되어야 합니다.

1. https://analytics.google.com/ 접속
2. 관리 → 속성 → **"Google Cloud 링크"**
3. GCP 프로젝트 `hokex-498415` 연결

---

## ✅ 해결 방법 2: Organization 레벨에서 추가

GA4 속성이 Organization 소속인 경우:

1. https://analytics.google.com/ 접속
2. 관리 → **계정** (속성이 아님) → **계정 액세스 관리**
3. Service Account 추가:
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
4. 역할: "뷰어"

---

## ✅ 해결 방법 3: 새 Service Account 생성 (최후 수단)

기존 Service Account가 문제인 경우:

### 1. 새 Service Account 생성
https://console.cloud.google.com/iam-admin/serviceaccounts?project=hokex-498415

1. **"서비스 계정 만들기"** 클릭
2. 이름: `ga4-viewer`
3. ID: `ga4-viewer@hokex-498415.iam.gserviceaccount.com`
4. **"만들기 및 계속하기"**
5. 역할: **"뷰어"** 또는 **"BigQuery 데이터 뷰어"**
6. **"완료"**

### 2. 키 생성
1. 생성된 Service Account 클릭
2. **"키"** 탭
3. **"키 추가"** → **"새 키 만들기"**
4. **JSON** 선택
5. 다운로드

### 3. Supabase에 새 키 설정
https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/settings/secrets

1. `GA_SERVICE_ACCOUNT_KEY` 환경변수 업데이트
2. 다운로드한 JSON 파일 내용 복사해서 붙여넣기

### 4. GA4에 새 Service Account 추가
1. https://analytics.google.com/ 접속
2. 관리 → 속성 액세스 관리
3. **새 Service Account 이메일 추가:**
   ```
   ga4-viewer@hokex-498415.iam.gserviceaccount.com
   ```
4. 역할: "뷰어"

---

## ✅ 해결 방법 4: Domain 인증 (추천)

Service Account가 특정 도메인만 허용하는 경우:

### Google Workspace Admin에서 설정
1. https://admin.google.com/ 접속
2. 보안 → API 제어 → **"도메인 전체 위임"**
3. 새 API 클라이언트 추가:
   - Client ID: Service Account의 Unique ID (GCP Console에서 확인)
   - OAuth 범위:
     ```
     https://www.googleapis.com/auth/analytics.readonly
     ```

---

## 🔍 원인 분석

### 왜 Service Account 추가가 안 되나?

1. **Organization 정책**
   - Organization 레벨에서 외부 Service Account 차단 가능
   - 해결: Organization 관리자에게 권한 요청

2. **도메인 제한**
   - GA4가 특정 도메인의 사용자만 허용
   - 해결: Domain 인증 (방법 4)

3. **UI 버그**
   - GA4 UI에서 Service Account 인식 실패
   - 해결: Google Cloud Console에서 직접 권한 부여 (방법 1)

---

## 🧪 테스트

권한 설정 후 5-10분 대기, 그 다음:

### Supabase에서 테스트
1. https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/functions
2. Edge Functions → `get-ga-stats`
3. **"Invoke function"** 클릭
4. 로그 확인

### 로컬에서 테스트
```bash
curl -X GET "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/get-ga-stats?region=both" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

---

## 💡 추천 순서

1. **방법 1 시도** (Google Cloud Console에서 IAM 권한 부여)
2. 5-10분 대기 후 테스트
3. 안 되면 **방법 2** (Organization 레벨)
4. 여전히 안 되면 **방법 3** (새 Service Account 생성)
5. 최후: **방법 4** (Domain 인증)

---

## 📞 필요한 정보

다음 중 어떤 방법을 시도할지 알려주세요:
1. Google Cloud Console에서 직접 권한 부여
2. Organization 레벨에서 추가
3. 새 Service Account 생성
4. 다른 Google 계정으로 대신 추가

또는, 현재 GA4 계정의 조직 구조를 알려주시면 더 정확한 해결책을 제시하겠습니다.
