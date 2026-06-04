# ✅ 방문자 통계 자동 업데이트 - 검증 가이드

## 📋 현재 상태

### ✅ 완료된 작업
1. **SQL 스크립트 실행**: `fix-timezone-and-cron.sql` ✓
   - KST 시간대 강제 적용
   - `update_visitor_stats_cache()` 함수 생성

2. **GitHub Actions 워크플로우 생성**: `.github/workflows/update-visitor-cache.yml` ✓
   - 30분마다 오늘 통계 업데이트
   - 새벽 4시 전체 캐시 새로고침

3. **GitHub Secrets 설정**: ✓
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

4. **디버그 워크플로우 추가**: `.github/workflows/update-visitor-cache-debug.yml` ✓

### ❌ 현재 문제
- **GitHub Actions 실행 실패**: Exit code 6
- **원인**: curl "Could not resolve host" - URL 형식 문제

---

## 🔧 즉시 해야 할 일

### 1️⃣ 디버그 워크플로우 실행 (최우선!)

1. **GitHub 리포지토리 페이지 열기**:
   ```
   https://github.com/your-username/hokex-front/actions
   ```

2. **왼쪽 사이드바에서 워크플로우 선택**:
   - "Update Visitor Stats Cache (DEBUG)" 클릭

3. **"Run workflow" 버튼 클릭**:
   - Branch: main 선택
   - "Run workflow" 클릭

4. **로그 확인**:
   - 실행 완료될 때까지 대기 (약 30초)
   - 각 단계 클릭하여 로그 확인
   - 전체 로그 복사

---

### 2️⃣ Supabase URL 재확인

**Supabase Dashboard 접속**:
1. https://supabase.com/dashboard
2. 프로젝트 선택
3. **Settings (왼쪽 하단)** → **API** 클릭
4. **Project URL** 복사 (예: `https://abcdefg.supabase.co`)

**올바른 형식**:
```
https://your-project.supabase.co
```

**주의사항**:
- ✅ `https://`로 시작해야 함
- ❌ 끝에 `/` (슬래시) 없어야 함
- ❌ `/functions/v1/...` 등 경로 포함 안 됨

---

### 3️⃣ GitHub Secrets 업데이트

**GitHub 리포지토리 페이지**:
1. **Settings** 탭 클릭
2. **Secrets and variables** → **Actions** 클릭
3. `SUPABASE_URL` 클릭
4. **Update** 버튼 클릭
5. **정확한 URL 입력** (위에서 복사한 것)
6. **Update secret** 클릭

**확인할 다른 Secrets**:
- `SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API → `anon` `public` (eyJ...로 시작)
- `SUPABASE_SERVICE_KEY`: Supabase Dashboard → Settings → API → `service_role` `secret` (eyJ...로 시작)

---

## 🧪 테스트 방법

### 방법 1: 디버그 워크플로우 (추천)
- 위의 1️⃣ 단계 실행
- 자동으로 모든 것 검증

### 방법 2: 원래 워크플로우 수동 실행
1. GitHub Actions 탭
2. "Update Visitor Stats Cache" 선택
3. "Run workflow" 클릭
4. 결과 확인

### 방법 3: curl 직접 테스트 (터미널)
```bash
# 실제 값으로 교체해서 실행
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "today"}'
```

**성공 응답**:
```json
{"success": true, "message": "Cache updated successfully"}
```

---

## 📊 검증 SQL

Supabase Dashboard → SQL Editor에서 실행:

### 캐시가 업데이트되었는지 확인
```sql
SELECT 
  stat_date,
  unique_visitors,
  page_views,
  updated_at
FROM visitor_stats_cache
ORDER BY stat_date DESC
LIMIT 5;
```

### 오늘 실제 데이터 확인
```sql
SELECT 
  DATE(visited_at AT TIME ZONE 'Asia/Seoul') as date,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(*) as page_views
FROM visitor_stats
WHERE visited_at >= NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

두 결과가 일치해야 함!

---

## 🎯 예상되는 에러별 해결책

| Exit Code | 의미 | 해결 방법 |
|-----------|------|-----------|
| 6 | Could not resolve host | URL 형식 확인 (`https://` 포함, `/` 제거) |
| 1 | HTTP != 200 | 아래 HTTP 상태 코드 확인 |

| HTTP 코드 | 의미 | 해결 방법 |
|-----------|------|-----------|
| 200 | 성공 ✅ | 문제 없음 |
| 401 | Unauthorized | `SUPABASE_ANON_KEY` 확인 |
| 404 | Not Found | Edge Function 미배포 → 배포 필요 |
| 500 | Internal Error | SQL 함수 오류 → 로그 확인 |

---

## 🚀 Edge Function 배포 (404 에러 시)

만약 HTTP 404 에러가 발생하면:

```bash
cd hokex-front
npx supabase functions deploy update-visitor-stats-cache
```

---

## 📞 다음 단계

### 즉시 해야 할 것:
1. ✅ **디버그 워크플로우 실행** (GitHub Actions에서)
2. ✅ **로그 전체 복사해서 보내기**

### 로그에서 확인할 내용:
- [ ] "SUPABASE_URL is set" 메시지 확인
- [ ] "URL starts with https://" 메시지 확인
- [ ] HTTP Status Code 확인
- [ ] Response Body 내용 확인

### 성공하면:
- 원래 워크플로우도 자동으로 작동할 것
- 30분마다 자동 업데이트 시작
- 시간대 문제 해결 완료

---

## 📝 관련 파일

- SQL 스크립트: `fix-timezone-and-cron.sql` ✓ 실행완료
- 워크플로우: `.github/workflows/update-visitor-cache.yml` ✓ 배포완료
- 디버그 워크플로우: `.github/workflows/update-visitor-cache-debug.yml` ✓ 배포완료
- 트러블슈팅: `VISITOR_CACHE_TROUBLESHOOTING.md` ✓ 생성완료
- Edge Function: `supabase/functions/update-visitor-stats-cache/index.ts` (기존)

