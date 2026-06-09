# Google Analytics 4 Permission 문제 해결 가이드

## 🔥 현재 상황

**에러 메시지:**
```
Error: GA4 API Error: {
  "error": {
    "code": 403,
    "message": "User does not have sufficient permissions for this property.",
    "status": "PERMISSION_DENIED"
  }
}
```

**원인:** Service Account(`hokex-analytics@hokex-498415.iam.gserviceaccount.com`)에 Google Analytics 4 속성에 대한 읽기 권한이 없습니다.

---

## ✅ 해결 방법 (3가지 중 1가지 선택)

### 방법 1: Google Analytics UI에서 직접 추가 (가장 쉬움) ⭐

이 방법이 **가장 간단하고 확실**합니다.

#### 1-1. Google Analytics 관리 페이지 접속

1. https://analytics.google.com/ 접속
2. 왼쪽 하단 ⚙️ **"관리"** 클릭
3. 중앙 열 **"속성"** 섹션에서 올바른 속성이 선택되었는지 확인
   - 속성 ID: **538348093**

#### 1-2. 속성 액세스 관리

1. **"속성 액세스 관리"** 클릭
2. 오른쪽 상단 **➕ 파란색 "추가" 버튼** 클릭

#### 1-3. Service Account 이메일 추가

**이메일 주소 입력:**
```
hokex-analytics@hokex-498415.iam.gserviceaccount.com
```

**역할 선택:**
- ✅ **뷰어** (Viewer) 체크

**"추가" 버튼 클릭**

#### ⚠️ "사용자 등록이 실패했다" 경고가 나타나는 경우

이것은 **정상적인 현상**입니다. Service Account는 실제 Google 사용자 계정이 아니기 때문입니다.

**하지만 여전히 추가가 가능합니다!**

다음 방법 중 하나를 시도하세요:

**해결책 A: 그냥 "추가" 버튼을 다시 클릭**
- 경고를 무시하고 "추가" 버튼을 한 번 더 클릭하면 추가되는 경우가 많습니다.

**해결책 B: 직접 사용자 목록에서 확인**
- 경고가 나타나도, 실제로는 추가되었을 수 있습니다.
- "속성 액세스 관리" 페이지를 새로고침하고
- `hokex-analytics@hokex-498415.iam.gserviceaccount.com`가 목록에 있는지 확인

**해결책 C: 경고 무시하고 강제로 저장**
1. 크롬 개발자 도구 열기 (F12)
2. Console 탭에서 다음 실행:
   ```javascript
   // 경고 다이얼로그를 무시하고 강제로 사용자 추가
   document.querySelector('button[type="submit"]').click()
   ```

**해결책 D: 다른 브라우저에서 시도**
- Chrome, Edge, Firefox 등 다른 브라우저에서 시도해보세요.

#### 1-4. 추가 확인

추가 후 **"속성 액세스 관리"** 목록에서 다음을 확인:
```
✅ hokex-analytics@hokex-498415.iam.gserviceaccount.com | 뷰어
```

---

### 방법 2: BigQuery 연동 사용 (추천 - 더 강력함) 🚀

Google Analytics UI에서 Service Account 추가가 계속 안 되면, **BigQuery를 통한 데이터 접근**이 더 확실합니다.

#### 장점:
- Service Account 권한 설정이 훨씬 쉬움
- Google Analytics UI 의존성 제거
- 더 유연하고 강력한 쿼리 가능
- 더 빠른 응답 속도

#### 2-1. GA4에서 BigQuery 연동

1. **Google Analytics 접속**
   - https://analytics.google.com/
   - 왼쪽 하단 ⚙️ "관리" 클릭

2. **BigQuery 링크 추가**
   - "속성" 열에서 **"BigQuery 링크"** 클릭
   - 오른쪽 상단 **"링크"** 버튼 클릭

3. **Google Cloud 프로젝트 선택**
   - 프로젝트: **hokex-498415** 선택
   - "확인" 클릭

4. **데이터 스트림 선택**
   - 연결할 데이터 스트림 선택
   - "다음" 클릭

5. **빈도 설정**
   - **매일** (Daily) 선택 (무료)
   - 또는 **스트리밍** (추가 비용 발생)
   - "다음" 클릭

6. **제출**
   - "제출" 클릭
   - 설정 완료!

#### 2-2. Service Account에 BigQuery 권한 부여

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/iam-admin/iam?project=hokex-498415

2. **Service Account에 역할 추가**
   - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 찾기
   - 우측 연필 아이콘 클릭 (편집)
   - **"다른 역할 추가"** 클릭

3. **BigQuery 역할 추가**
   - **BigQuery 데이터 뷰어** (`roles/bigquery.dataViewer`)
   - **BigQuery 사용자** (`roles/bigquery.user`)
   - "저장" 클릭

#### 2-3. Edge Function 수정

BigQuery를 사용하도록 Edge Function 코드를 수정해야 합니다.

**파일: `hokex-front/supabase/functions/get-ga-stats/index.ts`**

기존 GA4 Data API 대신 BigQuery를 사용하도록 수정:

```typescript
// BigQuery로 GA4 데이터 조회
async function getGA4StatsFromBigQuery(
  accessToken: string,
  startDate: string,
  endDate: string,
  countryFilter?: 'domestic' | 'international'
): Promise<number> {
  let whereClause = `event_date BETWEEN '${startDate.replace(/-/g, '')}' AND '${endDate.replace(/-/g, '')}'`
  
  if (countryFilter === 'domestic') {
    whereClause += ` AND geo.country = 'South Korea'`
  } else if (countryFilter === 'international') {
    whereClause += ` AND geo.country != 'South Korea'`
  }

  const query = `
    SELECT COUNT(DISTINCT user_pseudo_id) as active_users
    FROM \`hokex-498415.analytics_538348093.events_*\`
    WHERE ${whereClause}
  `

  const response = await fetch(
    'https://bigquery.googleapis.com/bigquery/v2/projects/hokex-498415/queries',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, useLegacySql: false }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BigQuery API Error: ${errorText}`)
  }

  const data = await response.json()
  return parseInt(data.rows[0].f[0].v || '0')
}
```

**참고:** 이 방법을 사용하려면 BigQuery 연동 후 최소 24시간 대기해야 데이터가 채워집니다.

---

### 방법 3: Google Workspace Domain-wide Delegation (고급 사용자용)

이 방법은 **Google Workspace (구 G Suite) 계정이 있을 때만** 작동합니다.

개인 Gmail 계정으로는 불가능합니다.

#### 3-1. Google Workspace Admin 콘솔 접속

1. https://admin.google.com/ 접속
2. Google Workspace 관리자 계정 로그인

#### 3-2. Service Account 클라이언트 ID 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/iam-admin/serviceaccounts?project=hokex-498415

2. **Service Account 클릭**
   - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 클릭

3. **클라이언트 ID 복사**
   - "고유 ID" 또는 "클라이언트 ID" 확인 (숫자)
   - 예: `123456789012345678901`

#### 3-3. Domain-wide Delegation 설정

1. **Google Workspace Admin 콘솔**
   - 보안 → API 제어 → 도메인 전체 위임 관리

2. **새로운 API 클라이언트 추가**
   - 클라이언트 ID: (위에서 복사한 ID)
   - OAuth 범위:
     ```
     https://www.googleapis.com/auth/analytics.readonly
     ```
   - "승인" 클릭

#### ⚠️ 주의사항

이 방법은 **Google Workspace 관리자 권한**이 필요합니다.

개인 Gmail 계정으로는 사용할 수 없습니다.

---

## 🧪 테스트 방법

설정이 완료되면 다음과 같이 테스트하세요:

### 1. Supabase Dashboard에서 테스트

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/functions

2. **get-ga-stats 함수 선택**
   - "Invoke" 탭 클릭

3. **테스트 실행**
   - "Invoke function" 버튼 클릭

4. **결과 확인**
   - 응답이 `{ "success": true, ... }`이면 성공!
   - 응답이 `{ "success": false, "error": "403" }`이면 권한 문제

### 2. 브라우저에서 테스트

1. **프론트엔드 접속**
   - 방문자 통계 페이지 접속

2. **Google Analytics 섹션 확인**
   - 데이터가 표시되면 성공!
   - "통계를 불러오는데 실패했습니다" → 권한 문제

### 3. Edge Function 로그 확인

1. **Supabase Dashboard**
   - Edge Functions → get-ga-stats → **Logs** 탭

2. **에러 메시지 확인**
   - `403 PERMISSION_DENIED` → 권한 문제 (위의 해결 방법 재확인)
   - `404 NOT_FOUND` → Property ID 오류
   - `401 UNAUTHORIZED` → Service Account 키 오류

---

## 🛠️ 문제 해결 (Troubleshooting)

### ❌ "User does not have sufficient permissions"

**원인:** Service Account가 Google Analytics 속성에 추가되지 않았습니다.

**해결:**
1. Google Analytics → 관리 → 속성 액세스 관리
2. `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 확인
3. 없으면 위의 **방법 1** 다시 진행
4. 있는데도 에러가 나면 **방법 2 (BigQuery)** 시도

---

### ❌ "이메일이 일치하지 않습니다"

**원인:** Service Account는 일반 Google 계정이 아니기 때문에 경고가 나타납니다.

**해결:**
1. 경고 무시하고 "추가" 버튼 다시 클릭
2. 또는 위의 **해결책 A-D** 시도
3. 계속 안 되면 **방법 2 (BigQuery)** 사용

---

### ❌ "Property not found"

**원인:** 잘못된 Property ID를 입력했습니다.

**해결:**
1. Google Analytics → 관리 → 속성 설정
2. **속성 ID** 확인: **538348093**
3. Supabase 환경 변수 `GA_PROPERTY_ID` 재확인

---

### ❌ BigQuery 연동 시 "Dataset not found"

**원인:** BigQuery 연동 후 24시간이 지나지 않았거나 데이터 전송이 안 됨

**해결:**
1. BigQuery Console에서 데이터셋 확인
   - https://console.cloud.google.com/bigquery?project=hokex-498415
2. `analytics_538348093` 데이터셋이 있는지 확인
3. 없으면 GA4 → 관리 → BigQuery 링크 재확인
4. 최소 24시간 대기

---

## 💡 제 추천 (우선순위)

1. **먼저 방법 1을 시도**하세요.
   - 가장 간단하고 빠릅니다.
   - 경고가 나타나도 무시하고 강제로 추가하세요.

2. **방법 1이 계속 안 되면 방법 2 (BigQuery)를 사용**하세요.
   - 더 확실하고 강력합니다.
   - 초기 설정은 복잡하지만 장기적으로 유리합니다.

3. **Google Workspace 계정이 있으면 방법 3**을 시도하세요.
   - 하지만 대부분의 경우 방법 1이나 2로 충분합니다.

---

## 📞 추가 도움이 필요한 경우

**현재 상태 확인:**
1. Google Analytics 속성 액세스 관리 페이지 스크린샷
2. Supabase Edge Function 로그 (최근 10줄)
3. 에러 메시지 전체 내용

위 정보를 제공하면 더 정확한 도움을 드릴 수 있습니다! 🚀
