# Google Analytics Service Account 설정 가이드

## 문제 상황
방문자 통계 페이지에서 Google Analytics 데이터를 불러오려고 하면 다음 에러가 발생합니다:
```
⚠️ 통계를 불러오는데 실패했습니다
Edge Function returned a non-2xx status code
```

## 원인
`get-ga-stats` Edge Function에 필요한 환경 변수가 설정되지 않았습니다:
- `GA_PROPERTY_ID`: Google Analytics 4 Property ID
- `GA_SERVICE_ACCOUNT_KEY`: Service Account JSON 키

---

## 해결 방법

### 1단계: Google Analytics 4 Property ID 확인

1. **Google Analytics 접속**
   - https://analytics.google.com/ 접속
   - 계정 로그인

2. **Property ID 확인**
   - 왼쪽 하단 ⚙️ "관리" 클릭
   - "속성 설정" 클릭
   - **속성 ID** 확인 (숫자만 있는 형식)
   - 예시: `123456789`

> ⚠️ 주의: 측정 ID(G-XXXXXXXXXX)가 아닌 **속성 ID(숫자)**를 사용해야 합니다!

---

### 2단계: Google Cloud Service Account 생성

#### 2-1. Google Cloud Console 접속

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 접속
   - Google 계정 로그인

2. **프로젝트 선택 또는 생성**
   - 상단 프로젝트 선택 드롭다운 클릭
   - 기존 프로젝트가 있으면 선택
   - 없으면 "새 프로젝트" 클릭
     - 프로젝트 이름: `HOKEX Analytics`
     - "만들기" 클릭

#### 2-2. Google Analytics Data API 활성화

1. **API 및 서비스 - 라이브러리**
   - 왼쪽 메뉴 → "API 및 서비스" → "라이브러리" 클릭
   - 또는 직접 링크: https://console.cloud.google.com/apis/library

2. **Analytics Data API 검색**
   - 검색창에 "Google Analytics Data API" 입력
   - "Google Analytics Data API" 클릭
   - "사용" 버튼 클릭

#### 2-3. Service Account 생성

1. **서비스 계정 메뉴**
   - 왼쪽 메뉴 → "IAM 및 관리자" → "서비스 계정" 클릭
   - 또는 직접 링크: https://console.cloud.google.com/iam-admin/serviceaccounts

2. **서비스 계정 만들기**
   - "서비스 계정 만들기" 버튼 클릭
   - **서비스 계정 세부정보**:
     - 서비스 계정 이름: `hokex-analytics-reader`
     - 서비스 계정 ID: `hokex-analytics-reader` (자동 생성됨)
     - 설명: `HOKEX Google Analytics 통계 조회용`
     - "만들기 및 계속하기" 클릭
   - **권한 부여 (선택사항)**: 건너뛰기 (완료 버튼 클릭)
   - **사용자에게 이 서비스 계정에 대한 액세스 권한 부여**: 건너뛰기 (완료 버튼 클릭)

3. **JSON 키 생성**
   - 생성된 서비스 계정 목록에서 `hokex-analytics-reader@...` 클릭
   - 상단 "키" 탭 클릭
   - "키 추가" → "새 키 만들기" 클릭
   - 키 유형: **JSON** 선택
   - "만들기" 클릭
   - JSON 파일 자동 다운로드 (예: `hokex-analytics-123abc.json`)
   - **⚠️ 중요**: 이 파일은 안전한 곳에 보관하세요!

#### 2-4. Service Account 이메일 복사

생성된 서비스 계정의 이메일 주소를 복사하세요:
```
hokex-analytics-reader@[PROJECT-ID].iam.gserviceaccount.com
```

---

### 3단계: Google Analytics에 Service Account 권한 부여

⚠️ **중요**: Service Account 이메일 추가 시 "이메일이 Google 계정과 일치하지 않습니다" 경고가 발생할 수 있습니다.

#### 방법 A: Google Analytics UI에서 추가 (권장)

1. **Google Analytics 관리 페이지**
   - https://analytics.google.com/ 접속
   - 왼쪽 하단 ⚙️ "관리" 클릭

2. **속성 액세스 관리**
   - "속성" 열에서 "속성 액세스 관리" 클릭
   - 오른쪽 상단 ➕ "추가" 버튼 클릭

3. **사용자 추가**
   - 이메일 주소: 위에서 복사한 Service Account 이메일 입력
     ```
     hokex-analytics@hokex-498415.iam.gserviceaccount.com
     ```
   - 역할 선택:
     - ✅ **뷰어** (Viewer) 선택
   - "추가" 버튼 클릭

**⚠️ "이메일이 Google 계정과 일치하지 않습니다" 경고가 발생하고 추가가 막히는 경우:**

Service Account는 일반 Google 계정이 아니므로 이 경고가 정상입니다. 하지만 UI에서 진행이 막힐 수 있습니다.

**해결 방법:**

#### 방법 B: gcloud CLI로 직접 권한 추가 (추천)

**✅ 이 방법이 가장 확실합니다!** Google Analytics UI에서 Service Account 추가가 막히는 경우 이 방법을 사용하세요.

**1. gcloud CLI 설치 확인**

PowerShell 또는 CMD에서 다음 명령어 실행:
```powershell
gcloud --version
```

**설치가 안 되어 있으면**:
- Windows 설치 링크: https://cloud.google.com/sdk/docs/install#windows
- 다운로드 후 설치 진행
- 설치 완료 후 **새 터미널 창**을 열어야 함

**2. Google 계정 인증**

```powershell
gcloud auth login
```
- 브라우저가 열리면 Google 계정으로 로그인
- "Google Cloud SDK가 액세스를 요청합니다" → "허용" 클릭

**3. 프로젝트 설정**

```powershell
gcloud config set project hokex-498415
```

출력 예시:
```
Updated property [core/project].
```

**4. Analytics Admin API 활성화**

```powershell
gcloud services enable analyticsadmin.googleapis.com
```

출력 예시:
```
Operation "operations/..." finished successfully.
```

**5. Service Account에 필요한 역할 추가**

Google Analytics API를 사용하려면 Service Account에 적절한 권한을 부여해야 합니다. 하지만 `roles/analytics.viewer`는 프로젝트 레벨에서 지원되지 않으므로, **Google Analytics 속성에 직접 권한을 부여**해야 합니다.

이 단계는 **Google Analytics UI에서만 가능**하므로, 다음 방법을 사용하세요:

**방법 1: Google Analytics Admin SDK 사용 (프로그래밍 방식)**

아래 명령어로 Service Account에 Viewer 권한을 부여합니다:

```powershell
gcloud alpha analytics accounts properties users create --account=ACCOUNT_ID --property=538348093 --email=hokex-analytics@hokex-498415.iam.gserviceaccount.com --role=viewer
```

**⚠️ 문제**: 이 명령어는 `ACCOUNT_ID`가 필요한데, Google Analytics 계정 ID를 모르는 경우 실행할 수 없습니다.

**방법 2: Google Analytics 웹 UI에서 직접 추가 (권장)**

1. **Google Analytics 접속**: https://analytics.google.com/
2. **관리** → **속성 액세스 관리** 클릭
3. **우측 상단 ➕ 버튼** 클릭
4. **이메일 주소 입력**:
   ```
   hokex-analytics@hokex-498415.iam.gserviceaccount.com
   ```
5. **역할 선택**: **뷰어** 체크
6. **추가** 클릭

**⚠️ "이메일이 Google 계정과 일치하지 않습니다" 에러가 발생하는 경우:**

이것은 정상입니다. Service Account는 실제 Google 계정이 아니기 때문에 UI에서 차단될 수 있습니다.

**해결책: Google Cloud Console IAM에서 기본 권한만 부여하고 테스트**

실제로 Google Analytics Data API는 Service Account가 **Google Analytics 속성에 직접 접근 권한**이 있으면 작동합니다. 하지만 UI에서 추가가 안 되는 경우, 다음과 같이 진행하세요:

```powershell
# Google Analytics Admin API 활성화 확인
gcloud services enable analyticsadmin.googleapis.com

# Analytics Data API 활성화 확인
gcloud services enable analyticsdata.googleapis.com
```

**6. 권한 확인**

Service Account가 Google Analytics에 접근할 수 있는지 확인:

```powershell
gcloud projects get-iam-policy hokex-498415 --format=json
```

출력에서 Service Account의 역할을 확인할 수 있습니다.

**7. 대안: 환경 변수 설정 후 Edge Function 로그로 정확한 에러 확인**

권한 설정이 복잡하므로, **일단 환경 변수를 설정하고 Edge Function을 실행**한 다음, **Supabase 로그**에서 정확한 에러를 확인하는 것이 가장 빠릅니다:

1. Supabase Dashboard → Edge Functions → `get-ga-stats` → **Invoke** 클릭
2. **Logs** 탭에서 에러 확인
3. 에러가 `403 Forbidden` 또는 `Permission denied`인 경우:
   - Google Analytics UI에서 Service Account 이메일을 **속성 사용자로 추가**
4. 에러가 `Invalid credentials`인 경우:
   - Service Account JSON 키를 다시 확인

**7. 완료!**

이제 **방문자 통계 페이지**로 가서 새로고침하면 Google Analytics 데이터가 표시됩니다! 🎉

#### 방법 C: 환경 변수만 먼저 설정하고 테스트

권한 문제를 일단 우회하고, 실제 에러를 확인하는 방법:

1. **Supabase에 환경 변수 설정** (4단계 진행)
2. **Edge Function 실행**
3. **정확한 에러 메시지 확인**
   - Supabase Dashboard → Edge Functions → `get-ga-stats` → Logs
   - 에러가 권한 문제인지, Property ID 문제인지 확인

#### 방법 D: Property ID 재확인

"이메일이 일치하지 않습니다" 경고는 **잘못된 속성**에 추가하려고 할 때도 발생할 수 있습니다.

1. **올바른 Property ID 확인**:
   - Google Analytics → 관리 → 속성 설정
   - **속성 ID** (숫자만) 확인: 예) `123456789`
   - ⚠️ **Measurement ID** (G-XXXXXXXXXX)와 혼동하지 마세요!

2. **올바른 속성 선택 확인**:
   - Google Analytics → 관리
   - 상단에서 올바른 계정 및 속성이 선택되었는지 확인

---

### 4단계: Supabase 환경 변수 설정

#### 4-1. JSON 키 파일 준비

다운로드한 JSON 파일을 텍스트 에디터로 열면 다음과 같은 형식입니다:
```json
{
  "type": "service_account",
  "project_id": "hokex-analytics-123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "hokex-analytics-reader@hokex-analytics-123.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**전체 JSON 내용을 한 줄로 복사**하세요. (줄바꿈 제거)

#### 4-2. Supabase Dashboard에서 환경 변수 추가

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 로그인
   - 프로젝트 선택: `qmhxnxnaawtjelqlgyig`

2. **Edge Functions 설정**
   - 왼쪽 메뉴 → "Edge Functions" 클릭
   - 상단 "Manage secrets" 또는 "Settings" 클릭

3. **환경 변수 추가**

   **첫 번째 환경 변수:**
   - Name: `GA_PROPERTY_ID`
   - Value: `123456789` (1단계에서 확인한 숫자)
   - "Add secret" 클릭

   **두 번째 환경 변수:**
   - Name: `GA_SERVICE_ACCOUNT_KEY`
   - Value: (전체 JSON 내용을 한 줄로 붙여넣기)
     ```json
     {"type":"service_account","project_id":"hokex-analytics-123",...}
     ```
   - "Add secret" 클릭

---

### 5단계: Edge Function 재배포 (선택사항)

환경 변수 변경 후 자동으로 반영되지만, 확실하게 하려면 재배포하세요:

```bash
cd hokex-front
supabase functions deploy get-ga-stats --project-ref qmhxnxnaawtjelqlgyig
```

또는 Supabase Dashboard에서:
- Edge Functions → `get-ga-stats` → "Redeploy" 클릭

---

### 6단계: 테스트

1. **브라우저에서 테스트**
   - 방문자 통계 페이지 새로고침
   - Google Analytics 섹션 확인
   - 정상적으로 통계가 표시되는지 확인

2. **Edge Function 로그 확인**
   - Supabase Dashboard → Edge Functions → `get-ga-stats` → Logs
   - 에러 메시지 확인

---

## 문제 해결

### ❌ "GA4 credentials not configured" 에러

**원인**: 환경 변수가 설정되지 않았습니다.

**해결**:
1. Supabase Dashboard → Edge Functions → Manage secrets
2. `GA_PROPERTY_ID`와 `GA_SERVICE_ACCOUNT_KEY` 확인
3. 값이 없으면 4단계를 다시 진행

---

### ❌ "Permission denied" 또는 "Access forbidden" 에러

**원인**: Service Account에 Google Analytics 권한이 없습니다.

**해결**:
1. Google Analytics → 관리 → 속성 액세스 관리
2. Service Account 이메일이 추가되었는지 확인
3. 역할이 "뷰어" 이상인지 확인

---

### ❌ "Invalid JSON" 에러

**원인**: Service Account JSON 키 형식이 잘못되었습니다.

**해결**:
1. JSON 파일을 다시 다운로드
2. 전체 내용을 **한 줄로** 복사 (줄바꿈 제거)
3. 따옴표나 특수문자가 깨지지 않았는지 확인
4. Supabase에 다시 입력

---

### ❌ "Property ID not found" 에러

**원인**: 잘못된 Property ID를 입력했습니다.

**해결**:
1. Google Analytics → 관리 → 속성 설정
2. **속성 ID**(숫자만 있는 형식)를 확인
3. 측정 ID(G-XXXXXXXXXX)와 혼동하지 마세요!

---

## 보안 주의사항

### ⚠️ Service Account JSON 키 보안

1. **Git에 절대 커밋하지 마세요**
   - `.gitignore`에 `*.json` 추가 권장
   - 실수로 커밋했다면 즉시 키를 삭제하고 새로 생성

2. **안전한 곳에 보관**
   - 비밀번호 관리자 사용 (1Password, Bitwarden 등)
   - 암호화된 저장소 사용

3. **정기적으로 키 교체**
   - 6개월~1년마다 새 키 생성 후 기존 키 삭제

4. **최소 권한 원칙**
   - Google Analytics에서 "뷰어" 권한만 부여
   - "편집자" 권한은 부여하지 마세요

---

## 완료 체크리스트

- [ ] Google Analytics Property ID 확인 완료
- [ ] Google Cloud Console에서 Service Account 생성 완료
- [ ] Google Analytics Data API 활성화 완료
- [ ] Service Account JSON 키 다운로드 완료
- [ ] Google Analytics에 Service Account 권한 부여 완료
- [ ] Supabase에 `GA_PROPERTY_ID` 환경 변수 추가 완료
- [ ] Supabase에 `GA_SERVICE_ACCOUNT_KEY` 환경 변수 추가 완료
- [ ] Edge Function 재배포 완료 (선택사항)
- [ ] 방문자 통계 페이지에서 정상 작동 확인 완료

---

## 참고 자료

- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Cloud Service Accounts: https://cloud.google.com/iam/docs/service-accounts
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Edge Function 코드: `hokex-front/supabase/functions/get-ga-stats/index.ts`
