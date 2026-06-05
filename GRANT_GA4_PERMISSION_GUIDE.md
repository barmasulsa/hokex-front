# Google Analytics Admin API로 Service Account 권한 부여 가이드

## 개요

UI에서 Service Account 이메일이 "Google 계정과 일치하지 않습니다" 에러로 추가가 막히는 경우, **Google Analytics Admin API를 프로그래밍 방식으로 사용**하여 권한을 부여할 수 있습니다.

---

## 사전 준비

### 1. Node.js 설치 확인

```cmd
node --version
npm --version
```

설치가 안 되어 있으면: https://nodejs.org/ 에서 다운로드

### 2. 필요한 패키지 설치

```cmd
cd c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front
npm install googleapis readline
```

---

## 단계 1: Google Analytics Admin API 활성화

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com?project=hokex-498415

2. **API 활성화**
   - "사용" 버튼 클릭

3. **Analytics Data API도 활성화 (필수)**
   - https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=hokex-498415
   - "사용" 버튼 클릭

---

## 단계 2: OAuth 2.0 클라이언트 생성

Service Account에 권한을 부여하려면, **본인의 Google 계정**으로 인증이 필요합니다.

### 2-1. OAuth 클라이언트 생성

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=hokex-498415

2. **"사용자 인증 정보 만들기" 클릭**
   - "OAuth 클라이언트 ID" 선택

3. **애플리케이션 유형 선택**
   - **"데스크톱 앱"** 선택
   - 이름: `GA4 권한 부여 스크립트`
   - "만들기" 클릭

4. **JSON 다운로드**
   - 생성 완료 후 JSON 다운로드 버튼 클릭
   - 파일명: `client_secret_xxxxx.json`

### 2-2. 클라이언트 정보 확인

다운로드한 JSON 파일을 텍스트 에디터로 열면:

```json
{
  "installed": {
    "client_id": "123456789-abcdefg.apps.googleusercontent.com",
    "project_id": "hokex-498415",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-xxxxxxxxxxxxxx",
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
  }
}
```

**필요한 정보:**
- `client_id`: 전체 복사
- `client_secret`: 전체 복사

---

## 단계 3: 스크립트 실행

### Windows CMD에서 실행

```cmd
cd c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front

set CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
set CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx

node grant-ga4-permission.js
```

### Windows PowerShell에서 실행

```powershell
cd c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front

$env:CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
$env:CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxx"

node grant-ga4-permission.js
```

---

## 단계 4: 브라우저에서 인증

스크립트 실행 후 다음과 같은 메시지가 표시됩니다:

```
🔐 다음 URL을 브라우저에서 열어 권한을 부여하세요:
https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=...

인증 후 표시되는 코드를 아래에 입력하세요:
코드 입력:
```

### 4-1. URL 복사 및 브라우저 접속

1. 출력된 URL을 복사
2. 브라우저에 붙여넣기
3. Google 계정 로그인 (GA4 관리자 권한이 있는 계정)

### 4-2. 권한 승인

1. **"Google이 확인하지 않은 앱"** 경고가 표시될 수 있음
   - "고급" 클릭
   - "GA4 권한 부여 스크립트(안전하지 않음)로 이동" 클릭

2. **권한 요청**
   - "Google Analytics 보기 및 관리" 권한 요청
   - "허용" 클릭

3. **인증 코드 복사**
   - 브라우저에 표시되는 코드 복사
   - 예: `4/0AbcDef123...`

### 4-3. 코드 입력

터미널로 돌아가서:

```
코드 입력: 4/0AbcDef123...
```

코드를 붙여넣고 Enter 키 누르기

---

## 단계 5: 권한 부여 확인

성공하면 다음과 같은 메시지가 표시됩니다:

```
✅ 인증 성공!

📊 GA4 Property 정보 확인 중...

✅ Property 정보:
  - 이름: HOKEX Analytics
  - ID: 538348093
  - 시간대: Asia/Seoul

👤 Service Account 권한 부여 중...

✅ 권한 부여 성공!
  - Email: hokex-analytics@hokex-498415.iam.gserviceaccount.com
  - Role: predefinedRoles/read
  - User Link: properties/538348093/userLinks/xxxxx

🎉 완료! 이제 Edge Function을 테스트하세요.
```

---

## 단계 6: 권한 확인

### Google Analytics UI에서 확인

1. **Google Analytics 접속**
   - https://analytics.google.com/

2. **속성 액세스 관리**
   - 관리 → 속성 액세스 관리

3. **Service Account 확인**
   - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 검색
   - 역할이 "뷰어"로 표시되어야 함

---

## 단계 7: Edge Function 테스트

### Supabase Dashboard에서 테스트

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/functions

2. **get-ga-stats Edge Function**
   - "Invoke" 버튼 클릭
   - 또는 "Logs" 탭에서 실행 로그 확인

### 프론트엔드에서 테스트

1. **방문자 통계 페이지 접속**
   - https://hokex.vercel.app/admin/visitor-stats (또는 로컬 개발 서버)

2. **Google Analytics 섹션 확인**
   - 통계가 정상적으로 표시되는지 확인

---

## 문제 해결

### ❌ "403 Forbidden" 에러

**원인**: OAuth 클라이언트로 인증한 Google 계정에 GA4 관리자 권한이 없습니다.

**해결**:
1. Google Analytics → 관리 → 속성 액세스 관리
2. 본인 계정에 "관리자" 역할이 있는지 확인
3. 역할이 "뷰어"나 "편집자"이면 "관리자"로 변경 요청

---

### ❌ "404 Not Found" 에러

**원인**: Property ID가 잘못되었습니다.

**해결**:
1. `grant-ga4-permission.js` 파일 열기
2. `propertyId` 값 확인:
   ```javascript
   propertyId: '538348093', // 올바른 값인지 확인
   ```
3. Google Analytics → 관리 → 속성 설정에서 "속성 ID" 재확인

---

### ❌ "User already exists" 에러

**원인**: Service Account가 이미 추가되어 있습니다.

**해결**:
1. 이미 추가되어 있으므로 문제없음!
2. Google Analytics → 관리 → 속성 액세스 관리에서 확인
3. 역할이 "뷰어" 이상이면 정상 작동

---

### ❌ "Invalid authentication credentials" 에러

**원인**: OAuth 클라이언트 정보가 잘못되었습니다.

**해결**:
1. `CLIENT_ID`와 `CLIENT_SECRET` 값 재확인
2. JSON 파일에서 정확히 복사했는지 확인
3. 따옴표나 공백이 포함되지 않았는지 확인

---

## 대안: GA4 속성 수준이 아닌 계정 수준에서 권한 부여

만약 위 방법이 여전히 실패하면, **Google Analytics 계정 수준**에서 권한을 부여할 수 있습니다:

### 스크립트 수정

`grant-ga4-permission.js` 파일 열어서 다음 부분 수정:

```javascript
// 변경 전
const userLink = await analyticsAdmin.properties.userLinks.create({
  parent: `properties/${CONFIG.propertyId}`,
  ...
});

// 변경 후
const userLink = await analyticsAdmin.accounts.userLinks.create({
  parent: `accounts/YOUR_ACCOUNT_ID`, // 계정 ID 입력
  ...
});
```

**계정 ID 확인 방법**:
1. Google Analytics → 관리
2. 상단 계정 이름 확인
3. URL에서 계정 ID 확인: `https://analytics.google.com/analytics/web/#/aXXXXXXXXw...`

---

## 완료 체크리스트

- [ ] Google Analytics Admin API 활성화 완료
- [ ] OAuth 2.0 클라이언트 생성 완료
- [ ] `CLIENT_ID`와 `CLIENT_SECRET` 환경 변수 설정 완료
- [ ] 스크립트 실행 및 브라우저 인증 완료
- [ ] Service Account 권한 부여 성공 메시지 확인 완료
- [ ] Google Analytics UI에서 Service Account 확인 완료
- [ ] Edge Function 테스트 완료
- [ ] 프론트엔드에서 통계 정상 표시 확인 완료

---

## 참고 자료

- Google Analytics Admin API: https://developers.google.com/analytics/devguides/config/admin/v1
- OAuth 2.0 for Desktop Apps: https://developers.google.com/identity/protocols/oauth2/native-app
- googleapis Node.js Client: https://github.com/googleapis/google-api-nodejs-client

---

## 스크립트 파일

- `grant-ga4-permission.js`: Service Account 권한 부여 스크립트
- 위치: `c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front\grant-ga4-permission.js`
