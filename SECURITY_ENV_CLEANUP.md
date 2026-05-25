# 🔒 환경변수 보안 정리 가이드

## ⚠️ 중요: 운영 중단 없이 진행하기

이 가이드는 **현재 운영 중인 사이트에 영향을 주지 않으면서** 보안을 강화하는 방법입니다.

## 현재 상황
`.env` 파일이 Git에 커밋되어 있어 Supabase 키가 노출되었습니다.

## 안전한 조치 순서

### 1. Vercel 환경변수 확인 (필수 - 먼저 확인!)
Vercel Dashboard에서 다음 환경변수가 설정되어 있는지 확인하세요:

**확인 방법:**
1. https://vercel.com/dashboard 접속
2. hokex 프로젝트 선택
3. Settings > Environment Variables 메뉴

**필요한 환경변수:**
```
VITE_SUPABASE_URL=https://qmhxnxnaawtjelqlgyig.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_APP_URL=https://hokex.vercel.app
```

⚠️ **만약 설정되어 있지 않다면:**
- 위 값들을 Vercel Dashboard에 추가해야 합니다
- Production, Preview, Development 모두 체크하세요
- **이 작업을 완료하기 전까지 .env 파일을 Git에서 삭제하지 마세요!**

### 2. 보안 헤더 배포 (이미 완료 ✅)
`vercel.json`에 보안 헤더가 추가되었습니다. 다음 배포 시 자동 적용됩니다.

### 3. .env 파일 처리 (선택사항 - 신중하게)

**옵션 A: 그냥 두기 (권장)**
- `.gitignore`에 추가했으므로 앞으로는 커밋 안 됨
- 기존 파일은 그대로 두고 히스토리에 남겨둠
- 장점: 운영 중단 위험 0%
- 단점: Git 히스토리에 키가 남아있음 (하지만 Supabase anon key는 RLS로 보호됨)

**옵션 B: Git에서 제거 (신중하게)**
⚠️ **주의:** Vercel 환경변수가 100% 설정되어 있는지 확인 후에만 진행하세요!

```bash
# 1. 먼저 Vercel Dashboard에서 환경변수 설정 확인
# 2. 로컬에서 .env 파일 백업
cp hokex-front/.env hokex-front/.env.backup

# 3. Git에서만 제거 (로컬 파일은 유지)
git rm --cached hokex-front/.env
git commit -m "chore: remove .env from git tracking"
git push

# 4. 배포 후 사이트 정상 작동 확인
# 5. 문제 없으면 백업 파일 삭제
```

### 4. 로컬 개발자 안내
팀원들에게 다음 안내를 해주세요:

```bash
# 1. 최신 코드 pull
git pull origin main

# 2. .env 파일 생성 (각자 로컬에서)
cp .env.example .env

# 3. .env 파일에 실제 값 입력
# (Vercel Dashboard 또는 팀 공유 문서에서 값 확인)
```

### 5. Git 히스토리에서 .env 제거 (선택사항 - 고급)

⚠️ **주의:** 이 작업은 Git 히스토리를 변경하므로 팀원들과 협의 후 진행하세요.
⚠️ **필수 아님:** Supabase anon key는 공개되어도 RLS로 보호되므로 급하지 않습니다.

```bash
# BFG Repo-Cleaner 사용 (권장)
# 1. BFG 다운로드: https://rtyley.github.io/bfg-repo-cleaner/
# 2. 실행
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 또는 git filter-branch 사용
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch hokex-front/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 강제 푸시 (팀원들과 협의 후)
git push origin --force --all
```

### 6. Supabase 키 재발급 (선택사항 - 권장)

Anon key는 공개되어도 RLS로 보호되지만, 베스트 프랙티스는 재발급입니다:

1. Supabase Dashboard 접속
2. Settings > API
3. "Reset anon key" 클릭
4. 새 키를 Vercel과 로컬 `.env`에 업데이트

## 완료 체크리스트

**즉시 완료 (운영 영향 없음):**
- [x] `.gitignore`에 `.env` 추가 완료
- [x] 보안 헤더 추가 완료 (vercel.json)
- [ ] Vercel 환경변수 설정 확인

**선택사항 (신중하게):**
- [ ] 팀원들에게 로컬 `.env` 설정 안내
- [ ] Git에서 `.env` 파일 제거 (Vercel 환경변수 확인 후)
- [ ] Git 히스토리에서 `.env` 제거 (필수 아님)
- [ ] Supabase anon key 재발급 (필수 아님)

## 다음 배포 시 확인사항

배포 후 다음을 확인하세요:
```bash
# 1. 환경변수가 제대로 로드되는지
curl https://hokex.vercel.app

# 2. 브라우저 개발자 도구에서 확인
# - Network 탭에서 Supabase API 호출 성공 여부
# - Console에서 "Missing Supabase environment variables" 에러 없는지
```

## 문제 발생 시

**증상:** "Missing Supabase environment variables" 에러
**해결:** Vercel Dashboard에서 환경변수 설정 후 재배포

**증상:** 로컬에서 앱이 실행되지 않음
**해결:** `.env` 파일 생성 및 값 입력
