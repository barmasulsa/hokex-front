# ❌ GitHub Actions 실패 문제 해결 가이드

## 문제 상황
- **에러**: `Error: Process completed with exit code 6`
- **원인**: curl exit code 6 = "Could not resolve host"
- **의미**: URL이 잘못되었거나 비어있음

## 🔍 즉시 확인할 사항

### 1️⃣ Supabase URL 형식 확인
**GitHub → Settings → Secrets → Actions → `SUPABASE_URL` 값 확인**

✅ **올바른 형식**:
```
https://your-project.supabase.co
```

❌ **잘못된 형식**:
```
your-project.supabase.co          (https:// 없음)
https://your-project.supabase.co/ (끝에 / 있음)
(비어있음)
```

### 2️⃣ Secrets 재설정 방법

1. **GitHub 리포지토리 페이지로 이동**
2. **Settings → Secrets and variables → Actions** 클릭
3. `SUPABASE_URL` 클릭하여 **Update** 선택
4. **새 값 입력 (정확히 이 형식)**:
   ```
   https://your-project-ref.supabase.co
   ```
   - ⚠️ 끝에 `/` (슬래시) **넣지 말 것**
   - ⚠️ `https://` 반드시 포함

5. **Update secret** 클릭

---

## 🔧 워크플로우 수정 (디버깅 모드)

현재 워크플로우는 URL을 출력하지 않습니다. 디버깅을 위해 URL 확인이 필요하면:



---

## 🧪 디버그 워크플로우 실행하기

새로운 디버그 워크플로우를 만들었습니다:
- 파일: `.github/workflows/update-visitor-cache-debug.yml`

**실행 방법**:
1. GitHub Actions 탭으로 이동
2. **"Update Visitor Stats Cache (DEBUG)"** 워크플로우 선택
3. **"Run workflow"** 버튼 클릭
4. 로그에서 정확한 에러 확인

이 워크플로우는:
- ✅ Secrets가 설정되어 있는지 확인
- ✅ URL 형식이 올바른지 확인
- ✅ Edge Function 연결 테스트
- ✅ 자세한 에러 메시지 출력

---

## 📋 가능한 에러 케이스

### Exit Code 6 (현재 상황)
**원인**: Could not resolve host
**해결**:
- `SUPABASE_URL`이 비어있음 → Secrets 설정 확인
- `https://` 누락 → URL 앞에 `https://` 추가
- 잘못된 URL 형식 → 정확한 Supabase 프로젝트 URL 확인

### HTTP 401 (Unauthorized)
**원인**: 인증 실패
**해결**:
- `SUPABASE_ANON_KEY` 확인
- Edge Function에서 `SUPABASE_SERVICE_KEY` 사용하는 경우 Secret 추가 확인

### HTTP 404 (Not Found)
**원인**: Edge Function이 배포되지 않음
**해결**:
```bash
cd hokex-front
npx supabase functions deploy update-visitor-stats-cache
```

### HTTP 500 (Internal Server Error)
**원인**: Edge Function 코드 오류
**해결**:
- Edge Function 로그 확인
- SQL 함수 `update_visitor_stats_cache()` 존재 여부 확인

---

## ✅ 해결 체크리스트

수동으로 하나씩 확인:

### 1. Supabase URL 확인
```bash
# 브라우저에서 Supabase Dashboard 열기
# Project Settings → API → Project URL 복사
```

예시: `https://abcdefghijk.supabase.co`

### 2. GitHub Secrets 설정
- [ ] `SUPABASE_URL` = `https://your-project.supabase.co` (끝에 / 없음)
- [ ] `SUPABASE_ANON_KEY` = `eyJ...` (긴 토큰 문자열)
- [ ] `SUPABASE_SERVICE_KEY` = `eyJ...` (Edge Function 내부에서 사용)

### 3. Edge Function 배포 상태 확인
```bash
# 로컬에서 배포 확인
cd hokex-front
npx supabase functions list
```

### 4. SQL 함수 존재 확인
Supabase Dashboard → SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'update_visitor_stats_cache';
```

결과가 나와야 함!

### 5. 수동 테스트
```bash
# curl로 직접 테스트 (터미널에서)
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "today"}'
```

---

## 🚀 다음 단계

### 즉시 해야 할 일:
1. **디버그 워크플로우 실행**:
   - GitHub Actions → "Update Visitor Stats Cache (DEBUG)" → Run workflow
   - 로그 전체 복사해서 알려주기

2. **Supabase URL 재확인**:
   - Supabase Dashboard → Settings → API
   - Project URL 복사
   - GitHub Secrets에서 `SUPABASE_URL` 업데이트

3. **결과 확인**:
   - 디버그 워크플로우가 성공하면 원래 워크플로우도 성공할 것

---

## 📞 추가 도움이 필요하면

다음 정보를 제공해주세요:
1. 디버그 워크플로우 실행 로그 (전체)
2. Supabase Project URL 형식 (마지막 부분 마스킹: `https://abc***.supabase.co`)
3. Edge Function 배포 여부 확인

