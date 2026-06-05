# Supabase CLI 설치 가이드 (Windows)

## 방법 1: Scoop 사용 (권장)

### 1단계: Scoop 설치 (이미 설치되어 있으면 건너뛰기)

PowerShell에서 실행:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### 2단계: Supabase CLI 설치

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3단계: 설치 확인

```powershell
supabase --version
```

---

## 방법 2: NPM 사용 (전역 설치)

```powershell
npm install -g supabase
```

확인:
```powershell
supabase --version
```

---

## 방법 3: 직접 다운로드

1. GitHub Releases 페이지 방문:
   https://github.com/supabase/cli/releases

2. 최신 Windows 버전 다운로드:
   `supabase_windows_amd64.zip` 또는 `supabase_windows_arm64.zip`

3. 압축 해제 후 `supabase.exe`를 `C:\Program Files\Supabase\` 경로에 복사

4. 환경 변수 PATH에 추가:
   - 시스템 속성 → 환경 변수 → Path 편집
   - `C:\Program Files\Supabase\` 추가

---

## 설치 후 로그인

```powershell
supabase login
```

브라우저가 열리면 Supabase 계정으로 로그인하세요.

---

## 프로젝트 연결

프로젝트 디렉토리에서:

```powershell
cd hokex-front
supabase link --project-ref YOUR_PROJECT_REF
```

프로젝트 REF는 Supabase Dashboard URL에서 확인:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

---

## Edge Function 배포

```powershell
cd hokex-front
supabase functions deploy update-visitor-stats-cache
```

---

## 문제 해결

### Scoop이 설치되지 않는 경우
- PowerShell을 관리자 권한으로 실행
- `Get-ExecutionPolicy`로 현재 정책 확인
- `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` 실행

### PATH 문제
- PowerShell을 재시작
- 새 터미널 창을 열어 다시 시도

### npm 설치 시 권한 오류
```powershell
npm install -g supabase --force
```
