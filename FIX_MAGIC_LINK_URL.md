# 매직 링크 URL 수정 가이드

## 문제
매직 링크 이메일에서 URL이 `http://localhost:5173/login`으로 표시됨

## 원인
`AuthContext.tsx`에서 `window.location.origin`을 사용하여 리다이렉트 URL을 설정했는데, 로컬 개발 환경에서 실행되면 localhost URL이 사용됨

## 해결 방법

### 1. 코드 수정 (완료)
`src/contexts/AuthContext.tsx`에서 환경 변수를 우선 사용하도록 수정:

```typescript
// 기존
emailRedirectTo: `${window.location.origin}/`,

// 수정
emailRedirectTo: import.meta.env.VITE_APP_URL || window.location.origin,
```

### 2. 환경 변수 추가 (완료)
`.env` 파일에 프로덕션 URL 추가:

```env
VITE_APP_URL=https://hokex.vercel.app
```

### 3. Vercel 환경 변수 설정 (필수)

#### 방법 1: Vercel Dashboard에서 설정
1. https://vercel.com/dashboard 접속
2. hokex-front 프로젝트 선택
3. Settings → Environment Variables
4. 새 환경 변수 추가:
   - **Name**: `VITE_APP_URL`
   - **Value**: `https://hokex.vercel.app`
   - **Environment**: Production, Preview, Development 모두 체크
5. Save 클릭

#### 방법 2: Vercel CLI로 설정
```bash
cd hokex-front
vercel env add VITE_APP_URL
# 값 입력: https://hokex.vercel.app
# Production, Preview, Development 선택
```

### 4. 재배포
환경 변수 추가 후 재배포 필요:

```bash
git add .
git commit -m "Fix: Magic link URL to use production domain"
git push origin main
```

또는 Vercel Dashboard에서 "Redeploy" 클릭

## 테스트

1. 프로덕션 환경에서 매직 링크 로그인 시도
2. 이메일 확인
3. 링크가 `https://hokex.vercel.app`로 시작하는지 확인

## 주의사항

- 로컬 개발 시에는 `.env` 파일의 `VITE_APP_URL`을 주석 처리하거나 `http://localhost:5173`으로 설정
- Vercel 환경 변수는 배포 시에만 적용됨
- 환경 변수 변경 후 반드시 재배포 필요

## 배포 완료 체크리스트

- [x] AuthContext.tsx 코드 수정
- [x] .env 파일에 VITE_APP_URL 추가
- [x] .env.example 업데이트
- [ ] Vercel 환경 변수 설정
- [ ] GitHub push
- [ ] Vercel 재배포
- [ ] 프로덕션에서 매직 링크 테스트
