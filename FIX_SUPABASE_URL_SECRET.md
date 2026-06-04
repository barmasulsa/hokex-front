# Supabase URL Secret 수정 가이드

## ❌ 현재 문제
- GitHub Actions에서 `Exit code 3` 발생 (URL 형식 오류)
- Secret에 저장된 URL에 보이지 않는 특수문자나 공백 포함 가능성

## ✅ 해결 단계

### 1️⃣ 기존 Secret 완전 삭제
1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. `SUPABASE_URL` 찾기
3. **Delete** 클릭 (Edit 말고 삭제!)

### 2️⃣ 새 Secret 생성
1. **New repository secret** 클릭
2. Name: `SUPABASE_URL` (정확히 입력)
3. Value: 아래 URL을 **직접 타이핑** (복붙 금지!)
   ```
   https://qmhxnxnaawtjelqlgyig.supabase.co
   ```
4. **Add secret** 클릭

### 3️⃣ 검증 포인트
- ✅ `https://`로 시작
- ✅ 끝에 `/` 없음
- ✅ 앞뒤 공백 없음
- ✅ 도메인: `qmhxnxnaawtjelqlgyig.supabase.co`

### 4️⃣ 다시 실행
1. GitHub → **Actions** 탭
2. **Update Visitor Stats Cache (DEBUG)** 선택
3. **Run workflow** 클릭

---

## 🎯 핵심: 직접 타이핑!

복사/붙여넣기를 하면 보이지 않는 문자가 포함될 수 있습니다.
**직접 타이핑**하거나, 메모장에서 한 글자씩 확인 후 사용하세요.

---

## 📌 올바른 URL 확인

프로젝트 URL: `https://qmhxnxnaawtjelqlgyig.supabase.co`

- 문자 수: 46자
- 프로토콜: `https://` (8자)
- 프로젝트 참조: `qmhxnxnaawtjelqlgyig` (20자)
- 도메인: `.supabase.co` (12자)

총 40자 (프로토콜 제외 시)
