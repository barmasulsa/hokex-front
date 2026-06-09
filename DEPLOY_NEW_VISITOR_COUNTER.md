# 새 방문자 카운터 시스템 배포 가이드

## 📋 준비 완료 체크리스트

- [x] **STEP 1-3**: SQL 파일 준비 완료
  - `setup-visitor-counter.sql` (테이블, 함수, RLS)
- [x] **STEP 4**: Edge Function 코드 준비 완료
  - `supabase/functions/track-visit/index.ts`
- [x] **STEP 5**: 프론트엔드 코드 업데이트 완료
  - `src/utils/visitorCounter.ts`
- [x] **STEP 6**: Cron 작업 SQL 준비 완료
  - `setup-visitor-counter-cron.sql`

---

## 🚀 배포 실행 단계

### 1️⃣ Edge Function 배포

```bash
cd hokex-front

# track-visit Edge Function 배포
supabase functions deploy track-visit

# 배포 확인
supabase functions list
```

**예상 출력:**
```
✓ Deployed Function track-visit
URL: https://<your-project>.supabase.co/functions/v1/track-visit
```

---

### 2️⃣ Cron 작업 설정 (선택 사항)

Supabase SQL Editor에서 다음 파일 실행:

```
supabase-migrations/setup-visitor-counter-cron.sql
```

**설정 내용:**
- **cleanup-visitor-dedup**: 매시 정각 (만료된 dedup 레코드 삭제)
- **reset-daily-visitor-counts**: 매일 자정 KST (today_count 리셋)

---

### 3️⃣ 프론트엔드 호출 부분 업데이트

기존 방문자 추적 코드를 찾아서 업데이트:

#### Before (기존)
```typescript
import { recordVisit, getVisitorStats } from '@/utils/visitorCounter';

// 방문 기록
await recordVisit();

// 통계 조회
const stats = await getVisitorStats();
console.log(stats.totalCount, stats.todayCount);
```

#### After (신규 - 동일)
```typescript
import { trackVisit, getVisitorStats } from '@/utils/visitorCounter';

// 방문 기록 (함수명만 변경)
await trackVisit();

// 통계 조회 (동일)
const stats = await getVisitorStats();
console.log(stats.totalCount, stats.todayCount);
```

**주요 변경사항:**
- `recordVisit()` → `trackVisit()`
- `getVisitorStats()` → 그대로 사용 (시그니처 변경됨)
- `dashboardUrl` 필드 제거됨

---

### 4️⃣ 사용 중인 페이지 찾기

프론트엔드에서 `recordVisit` 또는 `visitorCounter`를 import하는 파일 찾기:

```bash
# Windows PowerShell
cd hokex-front\src
Select-String -Pattern "recordVisit|visitorCounter" -Path *.tsx,*.ts -Recurse
```

또는 VS Code에서:
- `Ctrl+Shift+F` → `recordVisit` 검색
- 찾은 파일에서 `trackVisit`으로 변경

---

## ✅ 테스트 방법

### 1. Edge Function 테스트

```bash
# PowerShell
$body = @{ domain = "hokex.xyz" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://<your-project>.supabase.co/functions/v1/track-visit" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "apikey" = "<your-anon-key>" } `
  -Body $body
```

**예상 응답:**
```json
{
  "totalCount": 1,
  "todayCount": 1,
  "duplicate": false
}
```

### 2. 프론트엔드 테스트

1. 로컬 개발 서버 실행: `npm run dev`
2. 브라우저 콘솔 확인:
   ```
   [방문자 추적] 기록 성공: { today: 1, total: 1, duplicate: false }
   ```
3. 같은 세션에서 새로고침 → "이번 세션에서 이미 기록됨" 메시지 확인
4. 시크릿 모드로 재방문 → 20분 이내면 중복으로 처리

### 3. DB 확인

Supabase SQL Editor:
```sql
-- 사이트 통계 확인
SELECT * FROM visitor_sites WHERE domain = 'hokex.xyz';

-- 최근 로그 확인
SELECT vl.* 
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
ORDER BY vl.created_at DESC
LIMIT 10;

-- Dedup 상태 확인
SELECT COUNT(*) as active_dedup_records
FROM visitor_dedup
WHERE ttl_expiry > NOW();
```

---

## 🔧 트러블슈팅

### Edge Function 배포 실패

**문제:** `supabase functions deploy` 명령 실패

**해결:**
```bash
# Supabase CLI 업데이트
npm install -g supabase

# 프로젝트 링크 확인
supabase link --project-ref <your-project-ref>

# 재배포
supabase functions deploy track-visit
```

### "domain is required" 오류

**원인:** Edge Function에 domain 파라미터 누락

**해결:** `trackVisit()` 호출 시 `domain` 파라미터 확인
```typescript
await trackVisit('hokex.xyz');  // 명시적으로 전달
```

### 중복 방지가 작동하지 않음

**원인:** 20분 TTL이 만료되었거나 다른 브라우저/시크릿 모드 사용

**확인:**
```sql
SELECT * FROM visitor_dedup 
WHERE ttl_expiry > NOW()
ORDER BY last_visit DESC;
```

### today_count가 리셋되지 않음

**원인:** Cron 작업 미설정 또는 시간대 오류

**해결:**
```sql
-- Cron 작업 확인
SELECT * FROM cron.job;

-- 수동 리셋
SELECT reset_daily_visitor_counts();
```

---

## 📊 모니터링

### 일일 체크리스트

```sql
-- 1. 오늘 방문자 수 확인
SELECT domain, today_count, total_count, last_visit_date
FROM visitor_sites
WHERE domain = 'hokex.xyz';

-- 2. 최근 1시간 방문 로그
SELECT COUNT(*) as last_hour_visits
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at > NOW() - INTERVAL '1 hour';

-- 3. Dedup 레코드 수 (적정: 100~500개)
SELECT COUNT(*) as active_dedup
FROM visitor_dedup
WHERE ttl_expiry > NOW();
```

---

## 📝 완료 후 작업

- [ ] 기존 `VISITOR_STATS_COMPLETE_SETUP.sql` 파일 백업 폴더로 이동
- [ ] 오래된 visitor_stats 관련 SQL 파일 정리
- [ ] 1주일 후 백업 테이블 삭제 (visitor_stats_backup)
- [ ] 대시보드/모니터링 도구 업데이트 (있는 경우)

---

## 🎯 성공 기준

✅ Edge Function이 200 응답 반환  
✅ visitor_sites 테이블에 레코드 생성됨  
✅ visitor_logs에 방문 기록됨  
✅ 20분 이내 재방문 시 duplicate=true  
✅ 세션 내 재호출 시 "이미 기록됨" 메시지  
✅ 자정에 today_count가 0으로 리셋됨 (Cron 설정 시)

---

## 🔗 관련 파일

- `MIGRATION_TO_NEW_VISITOR_COUNTER.md` - 전체 마이그레이션 가이드
- `setup-visitor-counter.sql` - 테이블 및 함수 생성
- `setup-visitor-counter-cron.sql` - Cron 작업 설정
- `supabase/functions/track-visit/index.ts` - Edge Function
- `src/utils/visitorCounter.ts` - 프론트엔드 유틸리티

---

**배포 준비 완료! 위 단계를 순서대로 진행하세요.** 🚀
