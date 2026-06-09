# STEP 4, 5, 6 실행 가이드

## 📋 현재 상황

사용자가 **옵션 1**을 선택했습니다: 백업 테이블 삭제 후 마이그레이션 계속

## ✅ 실행 순서

### 1️⃣ STEP 2 실행 (기존 시스템 제거)

Supabase SQL Editor에서 다음 파일 실행:

```
hokex-front/delete-backup-and-continue.sql
```

**이 파일의 기능:**
- ✅ 기존 백업 테이블 삭제 (`visitor_stats_backup`, `visitor_stats_cache_backup`)
- ✅ 기존 시스템 완전 제거 (Cron, Trigger, Function, Table)
- ✅ 정리 상태 검증

---

### 2️⃣ STEP 3 실행 (새 시스템 설치)

Supabase SQL Editor에서 다음 파일 실행:

```
hokex-front/supabase-migrations/setup-visitor-counter.sql
```

**이 파일의 기능:**
- ✅ 새 테이블 생성 (`visitor_sites`, `visitor_logs`, `visitor_dedup`)
- ✅ RLS 정책 설정
- ✅ 헬퍼 함수 생성 (`clean_expired_dedup_records`, `reset_daily_visitor_counts`)

---

### 3️⃣ STEP 4, 5, 6 실행

Supabase SQL Editor에서 다음 파일 실행:

```
hokex-front/execute-step-4-5-6.sql
```

**이 파일의 기능:**
- ✅ Cron Job 생성 (만료된 레코드 정리 + 매일 자정 리셋)
- ✅ 시스템 검증 (테이블, 함수, Cron 확인)
- ⚠️  수동 작업 안내 출력

---

## 🛠️ 수동 작업 (STEP 4, 5)

SQL 실행 후 **반드시** 다음 작업을 수행해야 합니다:

### STEP 4: Edge Function 배포

```bash
cd hokex-front
supabase functions deploy track-visit
```

**테스트:**
```bash
supabase functions invoke track-visit --body '{"domain":"hokex.xyz"}'
```

---

### STEP 5: 프론트엔드 코드 수정

#### 5-1. `src/services/visitorService.ts` 파일 생성

```typescript
import { supabase } from './supabaseClient'

export const trackVisit = async (domain: string = 'hokex.xyz') => {
  try {
    const { data, error } = await supabase.functions.invoke('track-visit', {
      body: { domain }
    })

    if (error) throw error

    return {
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      isDuplicate: data.duplicate
    }
  } catch (error) {
    console.error('Failed to track visit:', error)
    return null
  }
}

export const getVisitorStats = async (domain: string = 'hokex.xyz') => {
  try {
    const { data, error } = await supabase
      .from('visitor_sites')
      .select('total_count, today_count, last_visit_date')
      .eq('domain', domain)
      .single()

    if (error) throw error

    return {
      totalCount: data?.total_count || 0,
      todayCount: data?.today_count || 0,
      lastVisitDate: data?.last_visit_date
    }
  } catch (error) {
    console.error('Failed to get visitor stats:', error)
    return { totalCount: 0, todayCount: 0, lastVisitDate: null }
  }
}
```

#### 5-2. 기존 호출 부분 교체

**변경 전:**
```typescript
await recordDetailedVisit()
const stats = await getCachedVisitorStats()
```

**변경 후:**
```typescript
import { trackVisit, getVisitorStats } from './services/visitorService'

await trackVisit()
const stats = await getVisitorStats()
```

#### 5-3. 빌드 및 배포

```bash
cd hokex-front
npm run build
git add -A
git commit -m "feat: 방문자 통계 시스템 마이그레이션 완료 (STEP 4, 5, 6)"
git push
```

---

## 🧪 검증 방법

### 1. SQL 검증 (Supabase SQL Editor)

```sql
-- 1. 테이블 확인
SELECT * FROM visitor_sites;
SELECT * FROM visitor_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM visitor_dedup ORDER BY last_visit DESC LIMIT 10;

-- 2. Cron Job 확인
SELECT jobname, active, schedule 
FROM cron.job 
WHERE jobname LIKE '%visitor%';

-- 3. 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%visitor%';
```

### 2. 실제 방문 테스트

1. 홈페이지 접속 (`hokex.xyz`)
2. 브라우저 개발자 도구 콘솔 확인
3. 방문 카운트 증가 확인

```sql
-- DB에서 확인
SELECT domain, total_count, today_count, last_visit_date
FROM visitor_sites
WHERE domain = 'hokex.xyz';
```

### 3. 중복 방지 테스트

1. 같은 브라우저로 20분 이내 재방문
2. 카운트가 증가하지 않아야 함
3. `visitor_dedup` 테이블에 레코드 확인

```sql
SELECT COUNT(*) as active_dedup_records
FROM visitor_dedup
WHERE ttl_expiry > NOW();
```

---

## 📊 마이그레이션 완료 체크리스트

- [ ] ✅ STEP 2 실행: `delete-backup-and-continue.sql`
- [ ] ✅ STEP 3 실행: `setup-visitor-counter.sql`
- [ ] ✅ STEP 6 실행: `execute-step-4-5-6.sql` (Cron 부분)
- [ ] 🔧 STEP 4 수동: Edge Function 배포
- [ ] 🔧 STEP 5 수동: 프론트엔드 코드 수정
- [ ] 🧪 테스트: 실제 방문 카운팅 확인
- [ ] 📈 모니터링: 24시간 통계 정확성 확인

---

## 🔄 문제 발생 시 롤백

```sql
-- 새 시스템 삭제
DROP TABLE IF EXISTS visitor_sites CASCADE;
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS visitor_dedup CASCADE;
DROP FUNCTION IF EXISTS clean_expired_dedup_records() CASCADE;
DROP FUNCTION IF EXISTS reset_daily_visitor_counts() CASCADE;
SELECT cron.unschedule('cleanup-visitor-dedup');
SELECT cron.unschedule('reset-daily-visitor-counts');

-- 백업 복원 (백업이 있다면)
ALTER TABLE visitor_stats_backup RENAME TO visitor_stats;
ALTER TABLE visitor_stats_cache_backup RENAME TO visitor_stats_cache;
```

---

## 💡 요약

1. **SQL 파일 3개 순서대로 실행**
   - `delete-backup-and-continue.sql` (STEP 2)
   - `setup-visitor-counter.sql` (STEP 3)
   - `execute-step-4-5-6.sql` (STEP 6)

2. **수동 작업 2개**
   - Edge Function 배포 (터미널)
   - 프론트엔드 코드 수정 (VSCode)

3. **테스트 및 검증**
   - SQL 검증
   - 실제 방문 테스트
   - 중복 방지 확인

---

## ❓ 도움말

- **Edge Function 배포 실패**: Supabase CLI 설치 및 로그인 확인
- **코드 수정 위치 불명확**: `src/App.tsx`에서 `recordDetailedVisit` 검색
- **카운트 증가 안 됨**: 브라우저 콘솔에서 에러 확인

---

**준비 완료! 이제 위 순서대로 실행하세요.** 🚀
