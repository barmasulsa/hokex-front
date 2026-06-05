# Google Analytics Stats Edge Function 배포 가이드

## ✅ 준비 완료된 파일들

### Edge Function (API Route)
- `supabase/functions/get-ga-stats/index.ts` ✅

### React 통합
- `src/hooks/useGoogleAnalytics.ts` ✅
- `src/components/AnalyticsStats.tsx` ✅
- `src/components/AnalyticsStats.css` ✅

### 문서
- `GOOGLE_ANALYTICS_API_GUIDE.md` ✅

---

## 🚀 배포 단계

### 1. Edge Function 배포

#### Windows PowerShell에서 실행:
```powershell
cd c:\Users\lcw55\OneDrive\바탕_화면\ai_mice\hokex-front
supabase functions deploy get-ga-stats
```

#### 또는 Windows CMD에서 실행:
```cmd
cd c:\Users\lcw55\OneDrive\바탕_화면\ai_mice\hokex-front
supabase functions deploy get-ga-stats
```

---

### 2. 환경 변수 설정 (Supabase Dashboard)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard

2. **프로젝트 선택** → **Settings** → **Edge Functions** → **Environment Variables**

3. **다음 변수 추가**:

   #### `GA_PROPERTY_ID`
   ```
   538348093
   ```

   #### `GA_SERVICE_ACCOUNT_KEY`
   Google Analytics 서비스 계정 JSON 파일 전체 내용:
   ```json
   {
     "type": "service_account",
     "project_id": "hokex-498415",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

---

### 3. 배포 확인

배포 후 Function URL:
```
https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats
```

#### 테스트 명령 (PowerShell):
```powershell
$headers = @{
    "Authorization" = "Bearer [SUPABASE_ANON_KEY]"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats" -Method POST -Headers $headers
```

---

### 4. React 앱에 통합

#### 4-1. 관리자 페이지에 추가

예: `src/pages/AdminDashboard.tsx` (새로 생성 또는 기존 페이지 수정)

```tsx
import React from 'react'
import { AnalyticsStats } from '../components/AnalyticsStats'

export function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>관리자 대시보드</h1>
      
      {/* Google Analytics 통계 */}
      <AnalyticsStats />
      
      {/* 다른 관리자 기능들... */}
    </div>
  )
}
```

#### 4-2. 라우트 추가

`src/App.tsx` 또는 라우터 설정 파일에 추가:

```tsx
import { AdminDashboard } from './pages/AdminDashboard'

// ...
<Route path="/admin" element={<AdminDashboard />} />
```

---

### 5. 로컬 개발 서버에서 테스트

#### 개발 서버 실행:
```powershell
cd c:\Users\lcw55\OneDrive\바탕_화면\ai_mice\hokex-front
npm run dev
```

또는

```powershell
yarn dev
```

#### 브라우저에서 확인:
```
http://localhost:5173/admin
```

---

## 🔧 트러블슈팅

### 문제: "GA4 credentials not configured" 오류

**해결책**: Supabase Dashboard에서 환경 변수가 올바르게 설정되었는지 확인

1. Settings → Edge Functions → Environment Variables
2. `GA_PROPERTY_ID`와 `GA_SERVICE_ACCOUNT_KEY`가 모두 설정되어 있는지 확인
3. Edge Function 재배포:
   ```powershell
   supabase functions deploy get-ga-stats
   ```

---

### 문제: CORS 오류

**해결책**: Edge Function이 이미 CORS 헤더를 포함하고 있으므로, 프론트엔드 URL이 Supabase 프로젝트 설정의 허용된 도메인에 포함되어 있는지 확인

1. Supabase Dashboard → Settings → API
2. "Site URL" 및 "Redirect URLs"에 프론트엔드 도메인 추가

---

### 문제: Edge Function이 호출되지 않음

**해결책**: Supabase Client 초기화 확인

`src/lib/supabaseClient.ts` 확인:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

`.env` 파일에 환경 변수 설정:
```
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📊 API 사용 예제

### 대한민국 방문자만 조회
```typescript
const { data, loading, error } = useGoogleAnalytics('domestic')
```

### 해외 방문자만 조회
```typescript
const { data, loading, error } = useGoogleAnalytics('international')
```

### 둘 다 조회 (기본값)
```typescript
const { data, loading, error } = useGoogleAnalytics('both')
```

---

## 🎯 완료 체크리스트

- [ ] Edge Function 배포 완료
- [ ] 환경 변수 설정 완료 (GA_PROPERTY_ID, GA_SERVICE_ACCOUNT_KEY)
- [ ] 로컬에서 테스트 완료
- [ ] 관리자 페이지에 컴포넌트 추가
- [ ] 프로덕션 배포 완료
- [ ] 실제 데이터 확인

---

## 📚 관련 문서

- [GOOGLE_ANALYTICS_API_GUIDE.md](./GOOGLE_ANALYTICS_API_GUIDE.md) - 전체 API 사용 가이드
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Google Analytics Data API 문서](https://developers.google.com/analytics/devguides/reporting/data/v1)

---

## 💡 참고사항

- Edge Function은 Supabase 서버에서 실행되므로 서버 측 환경 변수를 사용합니다
- 프론트엔드는 Vite 개발 서버(`npm run dev`)로 실행됩니다
- 프로덕션에서는 Vercel/Netlify 등에 프론트엔드를 배포하고, Edge Function은 Supabase에서 호스팅됩니다
- API 호출 비용은 Google Analytics Data API의 무료 할당량을 사용합니다
