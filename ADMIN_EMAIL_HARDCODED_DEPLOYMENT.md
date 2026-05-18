# 관리자 전용 인증 시스템 배포 가이드

## ✅ 변경 사항

**홈페이지는 누구나 접근 가능, 관리자 모드만 lcw5525@naver.com 전용**

### 1. 홈페이지 (누구나 접근 가능)
- ✅ 행사 목록 조회
- ✅ 필터링 및 검색
- ✅ 행사 상세 정보 보기
- ✅ 방문자 통계 확인
- ✅ 현재 접속 인원 확인
- ❌ 로그인 불필요

### 2. 관리자 모드 (lcw5525@naver.com만 접근 가능)
- 🔒 배너 관리 (이미지/유튜브/공지사항)
- 🔒 방문자 통계 상세 분석
- 🔒 통계 데이터 다운로드 (CSV/JSON)
- 🔒 통계 초기화
- ✅ 로그인 필요

## 📋 배포 방법

### 1. 프론트엔드 변경사항

**HomePage.tsx 수정 완료:**
- 로그인 체크 제거
- 누구나 홈페이지 접근 가능

**BannerManagementPage.tsx:**
- 관리자 체크 유지
- 관리자가 아니면 홈페이지로 리다이렉트

### 2. Edge Function 배포

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Edge Functions 메뉴로 이동**
   - 왼쪽 사이드바에서 "Edge Functions" 클릭

3. **check-stibee-subscriber 함수 선택**
   - 기존 함수 선택

4. **코드 업데이트**
   - `hokex-front/supabase/functions/check-stibee-subscriber/index.ts` 파일 내용 복사
   - Dashboard의 코드 에디터에 붙여넣기
   - "Deploy" 버튼 클릭

### 3. Vercel 배포

```bash
cd hokex-front
git add .
git commit -m "feat: allow public access to homepage, admin-only for management"
git push
```

Vercel이 자동으로 배포합니다.

## 🔒 보안 확인

### 현재 설정:

**일반 사용자 (로그인 없음):**
- ✅ 홈페이지 접근 가능
- ✅ 행사 목록 조회
- ✅ 필터링 및 검색
- ✅ 행사 상세 정보
- ❌ 배너 관리 불가능

**관리자 (lcw5525@naver.com):**
- ✅ 모든 기능 접근 가능
- ✅ 배너 관리
- ✅ 통계 관리
- ✅ 데이터 다운로드

**다른 이메일:**
- ❌ 로그인 불가능
- ❌ 관리자 모드 접근 불가능

### 테스트 방법:

1. **일반 사용자 (로그인 없음)**
   - https://hokex.vercel.app 접속
   - 결과: ✅ 홈페이지 정상 표시

2. **관리자 로그인**
   - https://hokex.vercel.app/login 접속
   - 이메일: `lcw5525@naver.com`
   - 결과: ✅ 로그인 성공, 배너 관리 접근 가능

3. **다른 이메일로 로그인 시도**
   - 이메일: `test@example.com`
   - 결과: ❌ 로그인 실패

## 📝 코드 변경 내용

### Edge Function (관리자 체크)

```typescript
// 🔒 관리자 이메일 체크 - lcw5525@naver.com만 관리자 권한
const ADMIN_EMAIL = 'lcw5525@naver.com'
const normalizedEmail = email.toLowerCase().trim()

if (normalizedEmail === ADMIN_EMAIL.toLowerCase().trim()) {
  // ✅ 관리자 접근 허용
  return { isSubscriber: true, status: 'ADMIN' }
} else {
  // ❌ 관리자 아님
  return { isSubscriber: false, message: 'Not authorized' }
}
```

### HomePage.tsx (로그인 불필요)

```typescript
// 홈페이지는 누구나 접근 가능 (로그인 불필요)
// 관리자 기능(배너 관리 등)만 로그인 필요
```

### BannerManagementPage.tsx (관리자 전용)

```typescript
// 관리자 권한 체크
useEffect(() => {
  if (!authLoading && !isAdmin) {
    alert('관리자만 접근할 수 있습니다.');
    navigate('/');
  }
}, [isAdmin, authLoading, navigate]);
```

## 🚀 배포 후 확인

1. **일반 사용자 접근 테스트**
   - https://hokex.vercel.app
   - 로그인 없이 홈페이지 접근 가능 확인

2. **관리자 로그인 테스트**
   - https://hokex.vercel.app/login
   - `lcw5525@naver.com`으로 로그인
   - 배너 관리 페이지 접근 확인

3. **비관리자 로그인 시도**
   - 다른 이메일로 로그인 시도
   - 로그인 실패 확인

## ⚠️ 주의사항

- **홈페이지는 완전 공개**입니다 (누구나 접근 가능)
- **관리자 모드만 `lcw5525@naver.com` 전용**입니다
- Stibee API는 사용하지 않습니다 (하드코딩된 관리자 이메일)
- 다른 관리자를 추가하려면 Edge Function 코드를 수정하고 재배포해야 합니다

## 🔄 다른 관리자 추가 방법 (나중에 필요할 경우)

```typescript
// 여러 관리자 이메일 허용
const ADMIN_EMAILS = [
  'lcw5525@naver.com',
  'another@example.com',  // 추가 관리자
]

const normalizedEmail = email.toLowerCase().trim()
const isAdmin = ADMIN_EMAILS.some(
  adminEmail => adminEmail.toLowerCase().trim() === normalizedEmail
)

if (isAdmin) {
  return { isSubscriber: true, status: 'ADMIN' }
} else {
  return { isSubscriber: false, message: 'Not authorized' }
}
```

---

**배포 완료 후 이 파일을 확인하여 정상 작동하는지 테스트하세요!**
