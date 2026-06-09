# Vercel 배포 가이드 - 방문자 통계 시스템

## 📋 배포 전 체크리스트

### 1. Supabase 설정 완료 확인

방문자 통계 시스템이 올바르게 작동하려면 다음 SQL 스크립트가 Supabase에 적용되어 있어야 합니다:

```bash
# Supabase SQL Editor에서 다음 파일 실행
VISITOR_STATS_COMPLETE_SETUP.sql
```

주요 구성 요소:
- ✅ `visitor_stats` 테이블 (원본 데이터)
- ✅ `visitor_stats_cache` 테이블 (집계 캐시)
- ✅ `get_business_date()` 함수 (새벽 4시 기준 날짜 계산)
- ✅ `update_visitor_stats_cache()` 함수 (캐시 업데이트)
- ✅ `increment_visitor_stat()` RPC 함수 (방문자 기록)
- ✅ 자동 트리거 (실시간 캐시 업데이트)
- ✅ pg_cron 스케줄러 (1분마다 캐시 재계산)
- ✅ RLS 정책 (보안 설정)

### 2. 필요한 Supabase 정보

다음 정보를 준비하세요:
- Supabase Project URL
- Supabase Anon Key
- (선택) Service Role Key (Edge Function용)

Supabase Dashboard에서 확인:
`Settings` → `API` → `Project URL` 및 `anon` `public` key

---

## 🚀 Vercel 배포 단계

### Step 1: Vercel CLI 설치 (선택사항)

```bash
npm install -g vercel
```

### Step 2: Vercel에 로그인

```bash
vercel login
```

### Step 3: 프로젝트 빌드 테스트

배포 전 로컬에서 빌드가 성공하는지 확인:

```bash
npm run build
```

### Step 4: Vercel 배포

#### 방법 A: Vercel CLI 사용

```bash
# 프로젝트 디렉토리에서 실행
cd hokex-front

# 첫 배포 (설정 진행)
vercel

# 프로덕션 배포
vercel --prod
```

#### 방법 B: Vercel Dashboard 사용 (권장)

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. `Add New` → `Project` 클릭
3. Git Repository 연결 또는 수동 업로드
4. Framework Preset: `Vite` 선택
5. Root Directory: `hokex-front` (필요시)
6. Build Command: `npm run build`
7. Output Directory: `dist`

### Step 5: 환경 변수 설정

Vercel Dashboard에서 환경 변수 추가:

`Settings` → `Environment Variables`

```env
# Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 프로덕션 URL (배포 후 업데이트)
VITE_APP_URL=https://your-vercel-domain.vercel.app
```

**중요**: 모든 환경 변수를 `Production`, `Preview`, `Development` 모두에 체크하세요.

### Step 6: 재배포

환경 변수 설정 후 재배포:

```bash
vercel --prod
```

또는 Vercel Dashboard에서 `Deployments` → `Redeploy` 클릭

---

## 🔧 배포 후 설정

### 1. 커스텀 도메인 연결 (선택사항)

Vercel Dashboard:
`Settings` → `Domains` → Add Domain

### 2. VITE_APP_URL 업데이트

배포가 완료되면 실제 도메인으로 환경 변수 업데이트:

```env
VITE_APP_URL=https://your-actual-domain.com
```

### 3. Supabase에 도메인 추가

Supabase Dashboard:
`Authentication` → `URL Configuration` → `Site URL` 및 `Redirect URLs`에 Vercel 도메인 추가

```
https://your-vercel-domain.vercel.app
https://your-vercel-domain.vercel.app/**
```

---

## ✅ 배포 확인

### 1. 방문자 통계 작동 확인

배포된 사이트에서:

1. **홈페이지 접속**
   - 방문자 카운터가 표시되는지 확인
   - 오늘/어제/최근 7일/최근 30일 통계 확인

2. **관리자 페이지 접속**
   - `/admin` 페이지 접속
   - 통계 섹션에서 동일한 수치 확인

3. **실시간 업데이트 확인**
   - 페이지를 새로고침하면 방문자 수가 증가하는지 확인
   - 관리자 페이지와 홈페이지의 통계가 동일한지 확인

### 2. Supabase에서 데이터 확인

Supabase SQL Editor에서:

```sql
-- 캐시 확인
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';

-- 원본 데이터 확인 (오늘)
SELECT * FROM visitor_stats 
WHERE visit_date = get_business_date(NOW())
ORDER BY visit_hour DESC;

-- pg_cron 작동 확인
SELECT * FROM cron.job WHERE jobname = 'update-visitor-stats-cache';
```

### 3. 브라우저 개발자 도구 확인

F12 → Network 탭:
- Supabase API 호출 성공 (200 OK)
- 에러 메시지 없음

Console 탭:
- 에러 메시지 없음
- 방문자 기록 성공 로그 확인

---

## 🐛 트러블슈팅

### 문제 1: 방문자 통계가 0으로 표시됨

**원인**: Supabase 설정이 완료되지 않음

**해결**:
1. Supabase SQL Editor에서 `VISITOR_STATS_COMPLETE_SETUP.sql` 실행
2. RLS 정책이 활성화되어 있는지 확인
3. 환경 변수가 올바른지 확인

### 문제 2: 빌드 실패

**원인**: TypeScript 타입 에러 또는 의존성 문제

**해결**:
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 타입 체크
npm run build
```

### 문제 3: 환경 변수가 undefined

**원인**: Vercel 환경 변수가 적용되지 않음

**해결**:
1. Vercel Dashboard에서 환경 변수 재확인
2. `VITE_` 접두사가 있는지 확인 (Vite 필수)
3. 재배포 실행

### 문제 4: RLS 정책 에러

**원인**: Supabase RLS 정책이 public 읽기를 허용하지 않음

**해결**:
```sql
-- visitor_stats_cache RLS 재설정
ALTER TABLE visitor_stats_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON visitor_stats_cache;
CREATE POLICY "Allow public read access"
ON visitor_stats_cache FOR SELECT
TO public
USING (true);
```

---

## 📊 모니터링

### Vercel Analytics

Vercel Dashboard:
`Analytics` 탭에서 실시간 트래픽 모니터링

### Supabase Logs

Supabase Dashboard:
`Logs` → `API` 탭에서 방문자 기록 확인

### 성능 최적화

- Vercel Edge Network가 자동으로 CDN 제공
- Vite의 코드 스플리팅으로 빠른 로딩
- Supabase 캐시로 DB 쿼리 최소화

---

## 🔄 자동 배포 설정

### GitHub 연동 (권장)

1. GitHub Repository 생성
2. 코드 푸시:
```bash
git init
git add .
git commit -m "Initial commit with visitor stats"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

3. Vercel에서 GitHub Repository 연결
4. 이후 `git push`할 때마다 자동 배포

### 자동 배포 브랜치 설정

Vercel Dashboard:
`Settings` → `Git` → `Production Branch`: `main`

---

## 📝 배포 후 체크리스트

- [ ] 홈페이지에서 방문자 통계 표시 확인
- [ ] 관리자 페이지에서 통계 확인
- [ ] 통계가 실시간으로 업데이트되는지 확인
- [ ] Supabase에서 데이터 기록 확인
- [ ] pg_cron 스케줄러 작동 확인
- [ ] 커스텀 도메인 설정 (선택)
- [ ] Supabase에 도메인 추가
- [ ] Analytics 설정 확인

---

## 🎉 완료!

방문자 통계 시스템이 Vercel에 성공적으로 배포되었습니다!

### 주요 기능:
- ✅ 실시간 방문자 카운팅
- ✅ 새벽 4시 기준 날짜 계산
- ✅ 오늘/어제/최근 7일/최근 30일 통계
- ✅ 관리자 페이지와 홈페이지 동기화
- ✅ 자동 캐시 업데이트 (1분마다)

### 지원:
문제가 발생하면 다음을 확인하세요:
1. Vercel 배포 로그
2. Supabase 로그
3. 브라우저 개발자 도구 Console

행복한 배포 되세요! 🚀
