# Vercel 배포 가이드

## 1. GitHub 저장소 준비

프로젝트가 GitHub에 업로드되어 있어야 합니다.

```bash
cd hokex-front
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/hokex-front.git
git push -u origin main
```

## 2. Vercel 배포

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Add New Project" 클릭
4. GitHub 저장소에서 `hokex-front` 선택
5. 프로젝트 설정:
   - Framework Preset: Vite
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (자동 감지됨)
   - Output Directory: `dist` (자동 감지됨)

## 3. 환경변수 설정

Vercel 프로젝트 설정에서 Environment Variables 추가:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase 대시보드 → Settings → API에서 확인 가능

## 4. Supabase RLS 정책 설정

다른 사용자들이 데이터를 조회할 수 있도록 공개 읽기 권한 설정:

```sql
-- events 테이블 공개 읽기 허용
CREATE POLICY "Enable read access for all users" ON "public"."events"
FOR SELECT
USING (true);

-- saved_events는 인증된 사용자만 (나중에 로그인 기능 추가 시)
CREATE POLICY "Users can view their own saved events" ON "public"."saved_events"
FOR SELECT
USING (auth.uid() = user_id);
```

Supabase 대시보드에서 실행:
1. SQL Editor 열기
2. 위 쿼리 실행
3. 또는 Authentication → Policies에서 GUI로 설정

## 5. 배포 완료

- Vercel이 자동으로 빌드하고 배포합니다
- 배포 완료 후 `https://your-project.vercel.app` 형태의 URL 생성
- 이 URL을 다른 사람들과 공유하면 됩니다

## 6. 자동 배포 설정

GitHub에 코드를 push하면 Vercel이 자동으로 재배포합니다:

```bash
git add .
git commit -m "Update feature"
git push
```

## 문제 해결

### 빌드 실패 시
- Vercel 대시보드에서 빌드 로그 확인
- 환경변수가 올바르게 설정되었는지 확인

### 데이터가 안 보일 때
- Supabase RLS 정책이 올바르게 설정되었는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- Supabase URL과 anon key가 올바른지 확인

### 커스텀 도메인 설정
- Vercel 프로젝트 → Settings → Domains
- 원하는 도메인 추가 (예: hokex.com)
