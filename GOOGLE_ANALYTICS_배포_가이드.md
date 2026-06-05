# 📊 Google Analytics 방문자 통계 배포 가이드

## ✅ 완료된 작업

### 1. **파일 생성 완료**
- ✅ Edge Function: `supabase/functions/get-ga-stats/index.ts`
- ✅ React Hook: `src/hooks/useGoogleAnalytics.ts`
- ✅ UI 컴포넌트: `src/components/AnalyticsStats.tsx`
- ✅ 컴포넌트 스타일: `src/components/AnalyticsStats.css`
- ✅ 관리자 페이지: `src/pages/AdminAnalyticsPage.tsx`
- ✅ 페이지 스타일: `src/pages/AdminAnalyticsPage.css`
- ✅ 라우팅 설정: `src/App.tsx` 업데이트 완료

### 2. **기능 특징**
- 🇰🇷 대한민국 방문자와 🌍 해외 방문자 구분
- 📊 9가지 기간별 통계 (오늘, 어제, 7일, 15일, 30일, 3개월, 6개월, 1년, 전체)
- 🔄 실시간 새로고침 기능
- 📱 반응형 디자인 (모바일/태블릿/데스크톱)
- 🔐 관리자 전용 페이지 (인증 필요)

---

## 🚀 배포 단계

### **1단계: Edge Function 배포**

#### Windows PowerShell 또는 CMD에서 실행:

```powershell
cd c:\Users\lcw55\OneDrive\바탕_화면\ai_mice\hokex-front
supabase functions deploy get-ga-stats
```

#### 예상 출력:
```
Deploying Function get-ga-stats...
Function URL: https://[프로젝트ID].supabase.co/functions/v1/get-ga-stats
Deployed successfully!
```

---

### **2단계: Supabase Dashboard에서 환경 변수 설정**

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - 프로젝트 선택

2. **환경 변수 설정 페이지로 이동**
   - 왼쪽 메뉴: **Settings** → **Edge Functions** → **Environment Variables**

3. **변수 추가 (Add new secret)**

   #### 변수 1: `GA_PROPERTY_ID`
   ```
   538348093
   ```

   #### 변수 2: `GA_SERVICE_ACCOUNT_KEY`
   - Google Analytics 서비스 계정 JSON 파일 전체 내용을 복사하여 붙여넣기
   - 형식 예시:
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

4. **저장 후 Edge Function 재배포 (옵션)**
   ```powershell
   supabase functions deploy get-ga-stats
   ```

---

### **3단계: 로컬 개발 서버에서 테스트**

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
1. 개발 서버 URL 열기 (보통 `http://localhost:5173`)
2. 관리자 계정으로 로그인
3. 상단 메뉴에서 **"📊 방문자 통계"** 클릭
4. 통계가 정상적으로 표시되는지 확인

---

### **4단계: 프로덕션 배포**

#### Vercel 또는 Netlify에 프론트엔드 배포

**Vercel 배포 (권장):**
```powershell
# Vercel CLI가 설치되어 있다면
vercel --prod

# 또는 GitHub에 푸시하면 자동 배포
git add .
git commit -m "Add Google Analytics dashboard"
git push origin main
```

**배포 후 확인:**
- 프로덕션 URL 접속 (예: `https://hokex.vercel.app`)
- 관리자 로그인
- `/admin/analytics` 페이지 접속
- 통계 데이터 확인

---

## 🔧 접근 방법

### **개발 환경에서:**
- URL: `http://localhost:5173/admin/analytics`
- 관리자 계정 필요

### **프로덕션 환경에서:**
- URL: `https://[도메인]/admin/analytics`
- 관리자 계정 필요

### **메뉴에서:**
- 관리자로 로그인 후 상단 메뉴에 **"📊 방문자 통계"** 링크가 자동으로 표시됨

---

## 🎯 기능 확인 체크리스트

- [ ] Edge Function 배포 완료
- [ ] Supabase Dashboard에서 환경 변수 설정 완료
  - [ ] `GA_PROPERTY_ID` 설정
  - [ ] `GA_SERVICE_ACCOUNT_KEY` 설정
- [ ] 로컬 개발 서버에서 테스트 완료
  - [ ] 통계 페이지 접근 가능
  - [ ] 대한민국 탭 정상 작동
  - [ ] 해외 탭 정상 작동
  - [ ] 새로고침 버튼 정상 작동
- [ ] 프로덕션 배포 완료
- [ ] 프로덕션에서 통계 확인 완료

---

## 🐛 트러블슈팅

### **문제 1: "GA4 credentials not configured" 오류**

**원인:** Supabase Dashboard에서 환경 변수가 설정되지 않음

**해결:**
1. Supabase Dashboard → Settings → Edge Functions → Environment Variables 확인
2. `GA_PROPERTY_ID`와 `GA_SERVICE_ACCOUNT_KEY` 둘 다 설정되어 있는지 확인
3. Edge Function 재배포:
   ```powershell
   supabase functions deploy get-ga-stats
   ```

---

### **문제 2: CORS 오류**

**원인:** Supabase 프로젝트 설정에서 프론트엔드 도메인이 허용되지 않음

**해결:**
1. Supabase Dashboard → Settings → API
2. "Site URL" 및 "Redirect URLs"에 프론트엔드 도메인 추가
   - 로컬: `http://localhost:5173`
   - 프로덕션: `https://[도메인]`

---

### **문제 3: 통계 페이지가 로딩만 되고 데이터가 안 나옴**

**원인:** Edge Function 호출 실패 또는 Google Analytics API 오류

**디버깅:**
1. 브라우저 개발자 도구 (F12) → Console 탭 확인
2. Network 탭에서 `get-ga-stats` 요청 확인
3. 응답 상태 코드 및 에러 메시지 확인

**일반적인 해결책:**
- Supabase 프로젝트의 서비스 계정에 Google Analytics 읽기 권한이 있는지 확인
- Google Cloud Console에서 Analytics Data API가 활성화되어 있는지 확인

---

### **문제 4: 관리자 페이지에 접근할 수 없음**

**원인:** 관리자 권한이 없는 계정으로 접근

**해결:**
- 관리자 계정으로 로그인했는지 확인
- Supabase Dashboard → Authentication → Users에서 해당 사용자의 `is_admin` 필드가 `true`인지 확인

---

## 📊 사용 방법

### **대한민국 방문자 통계 보기 (기본)**
- 페이지 로드 시 자동으로 **"🇰🇷 대한민국"** 탭이 선택됨
- 한국에서 접속한 방문자 수만 표시

### **해외 방문자 통계 보기**
- **"🌍 해외"** 탭 클릭
- 한국 외 지역에서 접속한 방문자 수 표시

### **통계 새로고침**
- 우측 상단 **🔄** 버튼 클릭
- 최신 데이터로 업데이트

---

## 💡 참고사항

### **데이터 업데이트 주기**
- Google Analytics는 실시간에 가까운 데이터를 제공하지만, 약간의 지연이 있을 수 있음
- 일반적으로 5~10분 지연

### **API 호출 제한**
- Google Analytics Data API 무료 할당량: 일일 25,000 요청
- 현재 구현: 페이지 로드 시 1회 호출, 수동 새로고침 시에만 추가 호출
- 예상 사용량: 하루 100~200회 (관리자만 접근)

### **통계 기간**
- **오늘**: 오늘 0시~현재
- **어제**: 어제 0시~23시 59분
- **최근 7일**: 오늘 포함 최근 7일
- **최근 30일**: 오늘 포함 최근 30일
- **전체**: 2020년 1월 1일부터 오늘까지

---

## 📚 관련 문서

- [GOOGLE_ANALYTICS_API_GUIDE.md](./GOOGLE_ANALYTICS_API_GUIDE.md) - 상세 API 사용 가이드
- [Supabase Edge Functions 공식 문서](https://supabase.com/docs/guides/functions)
- [Google Analytics Data API 공식 문서](https://developers.google.com/analytics/devguides/reporting/data/v1)

---

## ✨ 추가 기능 아이디어 (선택사항)

### **향후 개선 가능 항목:**
1. **지역별 상세 통계**: 국가별 방문자 순위
2. **시간대별 통계**: 시간대별 방문자 추이
3. **페이지별 통계**: 가장 많이 조회된 페이지
4. **디바이스별 통계**: 모바일/데스크톱/태블릿 비율
5. **자동 새로고침**: 1분마다 자동 업데이트
6. **CSV 내보내기**: 통계 데이터 다운로드 기능

---

## 🎉 완료!

모든 설정이 완료되면 관리자 대시보드에서 실시간 방문자 통계를 확인할 수 있습니다.

추가 질문이나 문제가 발생하면 언제든 문의하세요! 🚀
