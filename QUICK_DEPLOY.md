# 🚀 빠른 Vercel 배포 가이드

## 현재 상태
✅ 빌드 성공 완료
✅ 방문자 통계 시스템 준비 완료
✅ Supabase 설정 완료

---

## 배포 방법 (3가지 중 선택)

### 방법 1: Vercel CLI로 배포 (가장 빠름)

```bash
# Vercel CLI 설치 (이미 설치되어 있으면 생략)
npm install -g vercel

# 로그인
vercel login

# 배포 (프로젝트 디렉토리에서)
cd hokex-front
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 2: Vercel Dashboard로 배포

1. https://vercel.com/dashboard 접속
2. `Add New` → `Project` 클릭
3. `Import Git Repository` 또는 `Deploy with Vercel CLI` 선택
4. GitHub 저장소 연결하거나 폴더 업로드
5. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: `hokex-front` (필요시)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. `Deploy` 클릭

### 방법 3: GitHub 자동 배포 (권장)

```bash
# 1. GitHub 저장소 생성 후
git init
git add .
git commit -m "Add visitor stats system"
git remote add origin https://github.com/your-username/hokex-front.git
git push -u origin main

# 2. Vercel Dashboard에서 GitHub 저장소 연결
```

---

## 필수 환경 변수 설정

Vercel Dashboard → 프로젝트 → `Settings` → `Environment Variables`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=https://your-domain.vercel.app
```

**중요**: 
- `Production`, `Preview`, `Development` 모두 체크!
- 환경 변수 추가 후 재배포 필요

---

## 배포 후 확인

### 1. 웹사이트 접속
```
https://your-project.vercel.app
```

### 2. 방문자 통계 확인
- 홈페이지 하단에 방문자 수 표시 확인
- `/admin` 페이지에서 통계 확인

### 3. 실시간 업데이트 테스트
- 페이지 새로고침
- 방문자 수 증가 확인

---

## 배포 상태 확인

```bash
# Vercel CLI로 배포 상태 확인
vercel list

# 로그 확인
vercel logs
```

---

## 문제 해결

### 빌드 실패
```bash
# 로컬에서 다시 빌드 테스트
npm run build

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 환경 변수 오류
1. Vercel Dashboard에서 환경 변수 재확인
2. `VITE_` 접두사 확인
3. 재배포: `vercel --prod --force`

### 방문자 통계 안 보임
1. Supabase에서 `VISITOR_STATS_COMPLETE_SETUP.sql` 실행 확인
2. RLS 정책 확인
3. 브라우저 Console에서 에러 확인

---

## 현재 빌드 결과

```
✓ 1809 modules transformed
✓ dist/index.html (1.47 kB │ gzip: 0.81 kB)
✓ dist/assets/index-puBikWuc.css (83.96 kB │ gzip: 14.91 kB)
✓ dist/assets/index-BhCOGwlq.js (602.67 kB │ gzip: 166.11 kB)
✓ built in 1.14s
```

**배포 준비 완료!** 🎉

---

## 다음 단계

1. 위의 3가지 방법 중 하나 선택
2. 환경 변수 설정
3. 배포 실행
4. 배포된 URL 확인
5. 방문자 통계 작동 확인

더 자세한 내용은 `VERCEL_DEPLOYMENT_GUIDE.md` 참고!
