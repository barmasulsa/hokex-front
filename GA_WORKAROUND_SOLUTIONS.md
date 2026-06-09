# Google Analytics Service Account 권한 문제 해결 방법

## 문제 상황
Google Analytics UI에서 Service Account 이메일(`hokex-analytics@hokex-498415.iam.gserviceaccount.com`)을 추가하려고 하면 다음 에러가 발생합니다:
```
❌ "계정이 일치하지 않습니다" (Account does not match)
```

**원인**: Service Account는 일반 Google 사용자 계정이 아니므로, Google Analytics UI가 직접 추가를 차단합니다.

---

## ✅ 해결 방법 (3가지 옵션)

### 방법 1: Google Groups를 통한 우회 (⭐ 가장 권장)

Google Groups를 사용하여 Service Account에 간접적으로 권한을 부여합니다.

#### 단계 1: Google Groups 생성

1. **Google Groups 접속**
   - https://groups.google.com/ 접속
   - Google 계정으로 로그인 (Google Analytics 관리자 계정)

2. **새 그룹 만들기**
   - 좌측 상단 "그룹 만들기" 버튼 클릭
   - **그룹 이름**: `HOKEX Analytics Access`
   - **그룹 이메일**: `hokex-analytics-access@googlegroups.com`
     - (이미 사용 중이면 다른 이름 선택, 예: `hokex-ga-service@googlegroups.com`)
   - **그룹 설명**: `Service Account access for HOKEX Analytics`
   - **그룹 유형**: 이메일 목록 선택

3. **공개 설정 (중요!)**
   - "그룹에 가입할 수 있는 사용자": **소유자만** 선택
   - "그룹을 볼 수 있는 사용자": **그룹 구성원** 선택
   - "게시물을 볼 수 있는 사용자": **그룹 구성원** 선택
   - **이유**: Service Account만 있는 비공개 그룹이므로 보안 유지

4. **그룹 만들기**
   - "그룹 만들기" 버튼 클릭
   - 생성 완료!

#### 단계 2: Service Account를 그룹에 추가

1. **그룹 관리 페이지**
   - 방금 생성한 그룹 클릭
   - 좌측 메뉴에서 "멤버" 클릭

2. **멤버 추가**
   - "멤버 추가" 버튼 클릭
   - **이메일 주소**:
     ```
     hokex-analytics@hokex-498415.iam.gserviceaccount.com
     ```
   - **역할**: 멤버 (Member) 선택
   - **환영 메시지 전송**: 체크 해제 (Service Account는 이메일을 받을 수 없음)
   - "멤버 추가" 클릭

3. **확인**
   - 멤버 목록에 Service Account 이메일이 표시되는지 확인

#### 단계 3: Google Analytics에 그룹 추가

1. **Google Analytics 접속**
   - https://analytics.google.com/ 접속
   - 좌측 하단 ⚙️ "관리" 클릭

2. **속성 액세스 관리**
   - "속성" 열에서 "속성 액세스 관리" 클릭
   - 우측 상단 ➕ "추가" 버튼 클릭

3. **그룹 이메일 추가**
   - **이메일 주소**:
     ```
     hokex-analytics-access@googlegroups.com
     ```
     (실제 생성한 그룹 이메일 입력)
   - **역할 선택**:
     - ✅ **뷰어** (Viewer) 체크
   - "추가" 버튼 클릭

4. **권한 확인**
   - 속성 액세스 관리 목록에 그룹이 추가되었는지 확인
   - 역할이 "뷰어"인지 확인

#### 단계 4: 권한 전파 대기

- **대기 시간**: 5~10분
- Google의 권한 시스템이 변경 사항을 전파하는 시간 필요
- 커피 한 잔 ☕️

#### 단계 5: 테스트

1. **방문자 통계 페이지 새로고침**
   - 브라우저에서 방문자 통계 페이지 접속
   - F5 또는 Ctrl+R로 새로고침

2. **정상 작동 확인**
   - Google Analytics 섹션에 통계가 표시되는지 확인
   - 에러가 없으면 성공! 🎉

3. **실패 시 로그 확인**
   - Supabase Dashboard → Edge Functions → `get-ga-stats` → Logs
   - 에러 메시지 확인

---

### 방법 2: BigQuery Export 사용 (대안)

Google Analytics Data API 대신 BigQuery를 통해 데이터를 조회합니다.

**장점**:
- Service Account 권한 설정이 간단 (BigQuery 권한만 필요)
- 더 강력한 쿼리 기능
- 데이터 백업 가능

**단점**:
- BigQuery 설정 필요
- Edge Function 코드 수정 필요
- 소량의 비용 발생 가능 (무료 할당량 1TB/월 내에서는 무료)

#### 단계 1: Google Analytics에서 BigQuery Export 활성화

1. **Google Analytics 접속**
   - https://analytics.google.com/ 접속
   - 좌측 하단 ⚙️ "관리" 클릭

2. **BigQuery 링크 설정**
   - "속성" 열에서 "BigQuery 링크" 클릭
   - "링크" 버튼 클릭

3. **BigQuery 프로젝트 선택**
   - **BigQuery 프로젝트 선택**: `hokex-498415` 선택
   - **데이터 스트림 선택**: 웹사이트 데이터 스트림 선택
   - **데이터 위치**: 아시아 (asia-northeast3 - 서울) 권장

4. **내보내기 빈도 설정**
   - **일일**: 하루에 한 번 (권장, 무료)
   - **스트리밍**: 실시간 (비용 발생)
   - "다음" 클릭

5. **링크 만들기**
   - "제출" 버튼 클릭
   - 24시간 후부터 데이터가 BigQuery에 쌓이기 시작

#### 단계 2: Service Account에 BigQuery 권한 부여

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 접속
   - 프로젝트: `hokex-498415` 선택

2. **IAM 및 관리자**
   - 좌측 메뉴 → "IAM 및 관리자" → "IAM" 클릭

3. **Service Account에 역할 추가**
   - Service Account 찾기: `hokex-analytics@hokex-498415.iam.gserviceaccount.com`
   - 우측 연필 아이콘 (편집) 클릭
   - "다른 역할 추가" 클릭
   - **역할 선택**:
     - `BigQuery 데이터 뷰어` (BigQuery Data Viewer)
     - `BigQuery 작업 사용자` (BigQuery Job User)
   - "저장" 클릭

#### 단계 3: Edge Function 수정

BigQuery API를 사용하도록 코드를 수정해야 합니다. 이 작업은 복잡하므로 **방법 1을 먼저 시도하는 것을 강력히 권장**합니다.

코드 수정이 필요하면 말씀해주세요.

---

### 방법 3: Service Account 이메일과 API 활성화 재확인

권한 추가가 차단되는 것이 아니라 **다른 설정 문제**일 가능성도 있습니다.

#### 단계 1: Service Account 이메일 재확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 접속
   - 프로젝트: `hokex-498415` 선택

2. **Service Account 확인**
   - 좌측 메뉴 → "IAM 및 관리자" → "서비스 계정" 클릭
   - Service Account 이메일 확인:
     ```
     hokex-analytics@hokex-498415.iam.gserviceaccount.com
     ```
   - 정확히 복사 (공백 없이)

#### 단계 2: Google Analytics Data API 활성화 확인

1. **API 및 서비스 - 라이브러리**
   - 좌측 메뉴 → "API 및 서비스" → "라이브러리" 클릭

2. **Analytics Data API 검색**
   - 검색창에 "Google Analytics Data API" 입력
   - 클릭 후 상태 확인
   - **"관리"** 버튼이 표시되면 이미 활성화됨 ✅
   - **"사용"** 버튼이 표시되면 클릭하여 활성화

3. **Analytics Admin API도 활성화** (중요!)
   - 같은 방법으로 "Google Analytics Admin API" 검색
   - "사용" 클릭

#### 단계 3: Property ID 재확인

1. **Google Analytics 접속**
   - https://analytics.google.com/ 접속
   - 좌측 하단 ⚙️ "관리" 클릭

2. **속성 설정**
   - "속성" 열에서 "속성 설정" 클릭
   - **속성 ID** 확인:
     ```
     538348093
     ```
   - ⚠️ **측정 ID**(G-XXXXXXXXXX)가 아님!
   - Supabase 환경 변수에 이 숫자가 정확히 입력되었는지 확인

#### 단계 4: 환경 변수 재확인

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트: `qmhxnxnaawtjelqlgyig` 선택

2. **Edge Functions 환경 변수**
   - 좌측 메뉴 → "Edge Functions" 클릭
   - "Manage secrets" 또는 "Settings" 클릭

3. **변수 확인**
   - `GA_PROPERTY_ID`: `538348093` (숫자만)
   - `GA_SERVICE_ACCOUNT_KEY`: JSON 전체 내용 (한 줄)

4. **JSON 형식 확인**
   - JSON이 한 줄로 되어 있는지 확인
   - 시작: `{"type":"service_account",...`
   - 끝: `...}`
   - 줄바꿈 없음

#### 단계 5: Edge Function 재배포

```bash
cd hokex-front
supabase functions deploy get-ga-stats --project-ref qmhxnxnaawtjelqlgyig
```

또는 Supabase Dashboard에서:
- Edge Functions → `get-ga-stats` → "Redeploy" 클릭

---

## 🎯 권장 순서

1. **먼저 방법 3 (재확인) 실행** (5분)
   - Service Account 이메일 정확한지 확인
   - API 활성화 상태 확인
   - Property ID 정확한지 확인

2. **그래도 안 되면 방법 1 (Google Groups) 실행** (10분)
   - 가장 확실하고 간단한 해결책
   - UI 차단 문제를 우회

3. **방법 1도 실패하면 방법 2 (BigQuery) 검토**
   - 코드 수정 필요
   - 더 복잡하지만 확실함

---

## 🔍 추가 디버깅

### Edge Function 로그 직접 확인

1. **Supabase Dashboard**
   - Edge Functions → `get-ga-stats` → Logs

2. **최근 에러 확인**
   - `403 PERMISSION_DENIED` → Service Account 권한 문제
   - `404 NOT_FOUND` → Property ID 잘못됨
   - `401 UNAUTHORIZED` → Service Account JSON 키 문제
   - `Invalid JSON` → 환경 변수 형식 문제

### 수동으로 Edge Function 테스트

1. **Supabase Dashboard**
   - Edge Functions → `get-ga-stats` → "Invoke" 탭

2. **Request Body (선택사항)**
   ```json
   {}
   ```

3. **Invoke 클릭**

4. **Response 확인**
   - 성공 시: `{ "success": true, "data": {...} }`
   - 실패 시: 에러 메시지 확인

---

## 📞 추가 도움이 필요하면

위 방법을 시도한 후에도 문제가 해결되지 않으면 다음 정보를 알려주세요:

1. **어떤 방법을 시도했는지**
2. **Supabase Edge Function 로그의 정확한 에러 메시지**
3. **Google Analytics에서 그룹이 추가되었는지 여부** (방법 1 사용 시)

---

## ✅ 성공 확인

다음 사항이 모두 확인되면 성공입니다:

- [ ] Google Groups 생성 완료 (방법 1 사용 시)
- [ ] Service Account가 그룹 멤버로 추가됨 (방법 1 사용 시)
- [ ] Google Analytics에 그룹이 뷰어로 추가됨 (방법 1 사용 시)
- [ ] 5~10분 대기 후 테스트
- [ ] 방문자 통계 페이지에서 Google Analytics 데이터 정상 표시 ✅
- [ ] Edge Function 로그에 에러 없음 ✅

**성공하면 이 문서는 참고용으로 보관하세요!** 나중에 다른 Service Account 추가 시 같은 방법 사용 가능합니다.
