# GA4 Service Account 권한 문제 - 가장 간단한 해결 방법

## 문제 상황
- Service Account 이메일이 GA4 UI에서 추가 불가 ("이메일이 Google 계정과 일치하지 않습니다")
- 403 PERMISSION_DENIED 에러 발생

## 해결책: BigQuery Export가 아닌 "Google Cloud 링크" 생성

### 핵심: BigQuery 링크 ≠ Data API 권한

BigQuery 링크는 **데이터를 BigQuery로 내보내는 기능**이지, **Data API 접근 권한이 아닙니다**.

GA4 Data API를 사용하려면 **"Google Cloud 링크"를 통해 프로젝트를 연결**해야 합니다.

---

## ✅ 올바른 설정 단계

### 1단계: Google Cloud 링크 확인

1. **Google Analytics 접속**
   - https://analytics.google.com/
   - 왼쪽 하단 ⚙️ "관리" 클릭

2. **"제품 링크" 확인**
   - 속성 열에서 **"제품 링크"** 또는 **"Product Links"** 클릭
   - 또는 직접 링크: https://analytics.google.com/

3. **"Google Cloud 링크" 찾기**
   - 왼쪽 메뉴에서 **"Google Cloud 링크"** 또는 **"Google Cloud Links"** 클릭
   - **⚠️ 주의**: "BigQuery 링크"가 아닙니다!

4. **현재 상태 확인**
   - 이미 `hokex-498415` 프로젝트가 연결되어 있나요?
   - 연결되어 있으면 → **2단계로 바로 이동**
   - 연결되어 있지 않으면 → **아래 "Google Cloud 링크 생성" 진행**

---

### Google Cloud 링크 생성 (연결되어 있지 않은 경우만)

1. **"링크 구성" 또는 "Configure Link" 클릭**

2. **Google Cloud 프로젝트 선택**
   - 프로젝트 ID: `hokex-498415`
   - 프로젝트 이름: 검색해서 선택

3. **권한 설정**
   - 스트리밍 읽기 액세스 활성화 (선택사항)
   - 확인 버튼 클릭

4. **링크 생성 완료**
   - "Google Cloud 링크" 목록에 `hokex-498415` 표시 확인

---

### 2단계: 환경 변수가 올바르게 설정되었는지 확인

**Supabase Dashboard에서 확인**:
1. https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/settings/functions
2. "Secrets" 또는 "Environment Variables" 탭
3. 다음 변수가 설정되어 있는지 확인:
   - `GA_PROPERTY_ID`: `538348093`
   - `GA_SERVICE_ACCOUNT_KEY`: (JSON 전체 내용)

---

### 3단계: Edge Function 테스트

1. **Supabase Dashboard에서 테스트**
   - https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/functions
   - `get-ga-stats` 클릭
   - "Invoke" 버튼 클릭

2. **로그 확인**
   - "Logs" 탭 확인
   - 에러가 있으면 메시지 확인

3. **예상되는 결과**
   - ✅ 성공: `{ "success": true, "data": { ... } }`
   - ❌ 실패: 에러 메시지 확인 후 아래 문제 해결 참조

---

## 문제 해결

### ❌ "Google Cloud 링크" 메뉴가 안 보여요

**원인**: GA4 속성 설정에서 Google Cloud 통합이 비활성화되어 있을 수 있습니다.

**해결**:
1. Google Analytics → 관리
2. 속성 → "속성 설정" 클릭
3. "Google Cloud 통합" 섹션 확인
4. 활성화되어 있는지 확인

---

### ❌ 여전히 403 에러가 발생해요

**원인 1: Google Cloud 링크가 제대로 연결되지 않음**

**해결**:
1. Google Analytics → 관리 → 제품 링크 → Google Cloud 링크
2. `hokex-498415` 프로젝트가 **"연결됨"** 상태인지 확인
3. 연결되어 있지 않으면 다시 링크 구성

**원인 2: Service Account JSON 키가 잘못됨**

**해결**:
1. Google Cloud Console에서 Service Account 키 재생성:
   - https://console.cloud.google.com/iam-admin/serviceaccounts?project=hokex-498415
   - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 클릭
   - "키" 탭 → "키 추가" → "새 키 만들기" → JSON
   - 다운로드된 JSON 파일 전체 내용 복사
2. Supabase에서 `GA_SERVICE_ACCOUNT_KEY` 환경 변수 업데이트
3. Edge Function 재배포 또는 재시작

---

### ❌ "Google 클라우드 링크를 사용할 수 없습니다" 메시지가 떠요

**원인**: GA4 속성이 Google Cloud와 호환되지 않는 구조일 수 있습니다.

**해결 (대안)**:
1. **새 Service Account 생성**:
   - Google Cloud Console → IAM 및 관리자 → 서비스 계정
   - 새 Service Account 생성 (예: `ga4-analytics-v2`)
   - JSON 키 다운로드

2. **GA4 속성 액세스 관리에서 직접 추가 시도**:
   - Google Analytics → 관리 → 속성 액세스 관리
   - 새 Service Account 이메일 추가 시도
   - "뷰어" 역할 부여

3. **계속 실패하면**:
   - Service Account 대신 **일반 Google 계정** 생성
   - 해당 계정을 GA4에 추가
   - 해당 계정의 OAuth2 자격 증명으로 API 호출 (복잡함)

---

## 최종 확인 체크리스트

- [ ] Google Analytics에서 "Google Cloud 링크" 메뉴 찾음
- [ ] `hokex-498415` 프로젝트가 연결됨
- [ ] Supabase에 `GA_PROPERTY_ID` 환경 변수 설정됨
- [ ] Supabase에 `GA_SERVICE_ACCOUNT_KEY` 환경 변수 설정됨
- [ ] Edge Function 테스트 완료
- [ ] 프론트엔드에서 통계 정상 표시 확인

---

## 여전히 안 되면: 임시 해결책

Google Analytics Data API 대신 **Google Analytics Reporting API v4**를 사용하거나, **직접 Google OAuth2 인증**을 사용하는 방법도 있지만, 이는 구현이 복잡합니다.

가장 확실한 방법은:
1. **Google Workspace 계정** 생성 (유료)
2. 해당 계정으로 Service Account 생성
3. GA4에 추가

하지만 이는 비용이 발생하므로, **Google Cloud 링크**가 가장 간단합니다.

---

## 참고: "Google Cloud 링크"가 정말 없는 경우

GA4 속성에 따라 "Google Cloud 링크" 메뉴가 없을 수 있습니다. 이 경우:

### 대안: Google Analytics Admin API로 프로그래밍 방식 권한 부여

1. `GRANT_GA4_PERMISSION_GUIDE.md` 파일 참조
2. OAuth 2.0 클라이언트 생성
3. `grant-ga4-permission.js` 스크립트 실행
4. 브라우저에서 인증

이 방법은 복잡하지만, **UI에서 Service Account 추가가 막혔을 때 유일한 해결책**입니다.
