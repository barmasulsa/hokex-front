# 관리자 인증 시스템 설정 가이드

## ✅ 완료된 작업

### Phase 1 - Supabase 설정 (완료)
- ✅ `@supabase/supabase-js` 패키지 설치
- ✅ `src/lib/supabase.ts` - Supabase 클라이언트 설정
- ✅ `src/contexts/AuthContext.tsx` - 인증 상태 관리 (Google, Kakao, Naver 소셜 로그인 + Magic Link)
- ✅ `.env.example` - 환경 변수 템플릿
- ✅ `supabase-migrations/create-admin-auth.sql` - DB 마이그레이션 SQL
- ✅ `supabase-migrations/add-is-admin-column.sql` - `is_admin` 컬럼 추가 SQL
- ✅ `supabase-migrations/create-event-history.sql` - 변경 이력 테이블 생성 SQL

### Phase 2 - 로그인 페이지 (완료)
- ✅ `src/pages/LoginPage.tsx` - 소셜 로그인 + Magic Link 페이지
- ✅ `src/pages/LoginPage.css` - 로그인 페이지 스타일

### Phase 3 - UI 통합 (완료)
- ✅ `src/App.tsx` - AuthProvider 추가, 로그인/로그아웃 버튼
- ✅ `src/pages/HomePage.tsx` - useAuth() 훅 사용
- ✅ `src/components/EventCard.tsx` - useAuth() 훅 사용
- ✅ `src/App.css` - 인증 UI 스타일 추가

### Phase 4 - 관리자 기능 (완료)
- ✅ `src/pages/EventDetailPage.tsx` - URL 수정, 포스터 변경, 변경 이력 보기 기능
- ✅ `src/services/eventService.ts` - 이력 저장/조회/되돌리기 함수 추가

---

## 🔧 남은 작업 (사용자가 직접 수행)

### Step 1: 변경 이력 테이블 생성 (NEW!)

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. `hokex-front/supabase-migrations/create-event-history.sql` 파일 내용 복사
6. SQL Editor에 붙여넣기
7. **Run** 버튼 클릭하여 실행

이 작업으로 `event_history` 테이블이 생성되어 모든 변경사항이 추적됩니다.

### Step 2: Supabase 데이터베이스 설정 (이미 완료했다면 SKIP)

#### 1. SQL 마이그레이션 실행
1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. `hokex-front/supabase-migrations/create-admin-auth.sql` 파일 내용 복사
6. SQL Editor에 붙여넣기
7. **Run** 버튼 클릭하여 실행

이 작업으로 `user_profiles` 테이블이 생성됩니다.

#### 2. OAuth 제공자 설정

##### Google OAuth 설정
1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 찾아서 클릭
3. **Enable Sign in with Google** 토글 활성화
4. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성:
   - https://console.cloud.google.com/apis/credentials
   - **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Supabase에서 제공하는 Callback URL 복사하여 추가
5. Client ID와 Client Secret을 Supabase에 입력
6. **Save** 클릭

##### Kakao OAuth 설정
1. Supabase Dashboard → **Authentication** → **Providers**
2. **Kakao** 찾아서 클릭
3. **Enable Sign in with Kakao** 토글 활성화
4. Kakao Developers에서 앱 생성:
   - https://developers.kakao.com/console/app
   - 앱 생성 후 **내 애플리케이션** → 해당 앱 선택
   - **제품 설정** → **카카오 로그인** 활성화
   - **Redirect URI** 설정: Supabase에서 제공하는 Callback URL 추가
5. REST API 키를 Supabase의 Client ID에 입력
6. Client Secret은 Kakao에서 발급받아 입력 (선택사항)
7. **Save** 클릭

##### Naver OAuth (커스텀 구현 필요)
⚠️ **주의**: Naver는 Supabase에서 기본 지원하지 않습니다.
- 현재는 알림 메시지만 표시됩니다
- 커스텀 OAuth 구현이 필요합니다 (추후 작업)

#### 3. 환경 변수 설정
1. Supabase Dashboard → **Settings** → **API**
2. 다음 값들을 복사:
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **anon public** key

3. `hokex-front/.env.local` 파일 생성:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **중요**: `.env.local` 파일은 절대 Git에 커밋하지 마세요!

#### 4. 관리자 계정 생성
1. 먼저 Google 또는 Kakao로 로그인하여 계정 생성
2. Supabase Dashboard → **Authentication** → **Users**에서 사용자 ID 확인
3. Supabase Dashboard → **SQL Editor**에서 다음 쿼리 실행:

```sql
-- 사용자 ID를 실제 ID로 교체하세요
INSERT INTO public.user_profiles (id, email, is_admin)
VALUES (
  'user-uuid-here',  -- 실제 사용자 UUID
  'admin@example.com',  -- 실제 이메일
  true  -- 관리자 권한
)
ON CONFLICT (id) 
DO UPDATE SET is_admin = true;
```

---

### Phase 5 - Vercel 배포 설정

#### 1. Vercel 환경 변수 추가
1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수 추가:
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
4. **Save** 클릭

#### 2. 재배포
- Vercel이 자동으로 재배포하거나
- **Deployments** → 최신 배포 → **Redeploy** 클릭

---

## 🧪 테스트 체크리스트

### 로그인 테스트
- [ ] Google 로그인 작동 확인
- [ ] Kakao 로그인 작동 확인
- [ ] 로그인 후 사용자 이메일 표시 확인
- [ ] 로그아웃 작동 확인

### 관리자 권한 테스트
- [ ] 관리자 계정으로 로그인
- [ ] "관리자" 배지 표시 확인
- [ ] "관리자 모드" 알림 배너 표시 확인
- [ ] 행사 제목 클릭하여 수정 가능 확인
- [ ] 일반 사용자는 수정 불가 확인

### 프로필 페이지 테스트
- [ ] `/profile` 페이지 접근 확인
- [ ] 사용자 정보 표시 확인

---

## 📁 생성된 파일 목록

### 새로 생성된 파일
- `hokex-front/src/lib/supabase.ts`
- `hokex-front/src/contexts/AuthContext.tsx`
- `hokex-front/src/pages/LoginPage.tsx`
- `hokex-front/src/pages/LoginPage.css`
- `hokex-front/.env.example`
- `hokex-front/supabase-migrations/create-admin-auth.sql`
- `hokex-front/ADMIN_AUTH_SETUP_GUIDE.md` (이 파일)

### 수정된 파일
- `hokex-front/src/App.tsx` - AuthProvider 추가, 헤더에 로그인/로그아웃 버튼
- `hokex-front/src/pages/HomePage.tsx` - isAdmin prop 제거, useAuth() 훅 사용
- `hokex-front/src/components/EventCard.tsx` - isAdmin prop 제거, useAuth() 훅 사용
- `hokex-front/src/App.css` - 인증 관련 스타일 추가

---

## 🔒 보안 참고사항

1. **환경 변수 보호**
   - `.env.local` 파일은 절대 Git에 커밋하지 마세요
   - `.gitignore`에 `.env.local`이 포함되어 있는지 확인하세요

2. **RLS (Row Level Security)**
   - `user_profiles` 테이블에 RLS 정책이 설정되어 있습니다
   - 사용자는 자신의 프로필만 읽을 수 있습니다
   - 관리자 여부는 서버에서 확인됩니다

3. **OAuth Redirect URI**
   - 프로덕션 도메인을 OAuth 제공자에 등록하세요
   - 개발 환경(`localhost`)도 별도로 등록 가능합니다

---

## 🆘 문제 해결

### "Invalid API key" 오류
- `.env.local` 파일이 올바른 위치에 있는지 확인
- 환경 변수 이름이 `VITE_` 접두사로 시작하는지 확인
- 개발 서버 재시작 (`npm run dev`)

### 로그인 후 리다이렉트 안 됨
- OAuth 제공자에 Redirect URI가 올바르게 설정되었는지 확인
- Supabase Dashboard에서 Callback URL 확인

### 관리자 권한이 작동하지 않음
- `user_profiles` 테이블에 사용자가 추가되었는지 확인
- `is_admin` 필드가 `true`로 설정되었는지 확인
- 브라우저 캐시 삭제 후 재로그인

---

## 📞 다음 단계

1. 위의 Phase 4, 5 작업을 완료하세요
2. 테스트 체크리스트를 확인하세요
3. 문제가 있으면 문제 해결 섹션을 참고하세요
4. 추가 기능이 필요하면 요청하세요 (예: 프로필 페이지 구현, Naver OAuth 등)
