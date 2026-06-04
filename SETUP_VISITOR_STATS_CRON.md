# 방문자 통계 자동 업데이트 설정 가이드

## 🎯 목표

1. **30분마다**: 오늘 방문자 수만 업데이트 (빠른 업데이트)
2. **새벽 4시**: 전체 통계 업데이트 (일일 집계)
3. **시간대 문제 해결**: UTC → KST 기준으로 변경

---

## 📋 1단계: 시간대 문제 수정

### 1-1. SQL 실행

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- fix-timezone-and-cron.sql 파일 내용 실행
```

### 1-2. 프론트엔드 코드 확인

`src/utils/detailedAnalytics.ts` 파일에서 이미 KST 변환 로직이 적용되어 있습니다:

```typescript
const now = new Date();
const kstOffset = 9 * 60; // 9시간을 분으로 변환
const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
const date = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD (한국 날짜)
const hour = kstTime.getUTCHours(); // 0-23 (한국 시간대)
```

✅ **이미 클라이언트에서 KST로 변환하여 전송하므로 추가 수정 불필요**

---

## 📋 2단계: Supabase Cron 설정

### 방법 A: pg_cron 사용 (Supabase Pro 이상)

Supabase Pro 플랜 이상에서만 사용 가능합니다.

```sql
-- pg_cron extension 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 30분마다: 오늘 방문자 수 업데이트
SELECT cron.schedule(
  'update-visitor-cache-today',
  '*/30 * * * *', -- 매 30분마다
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := jsonb_build_object('type', 'today')
  );
  $$
);

-- 새벽 4시: 전체 통계 업데이트
SELECT cron.schedule(
  'update-visitor-cache-full',
  '0 4 * * *', -- 매일 새벽 4시
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := jsonb_build_object('type', 'full')
  );
  $$
);

-- Cron 작업 확인
SELECT * FROM cron.job;

-- Cron 작업 삭제 (필요시)
-- SELECT cron.unschedule('update-visitor-cache-today');
-- SELECT cron.unschedule('update-visitor-cache-full');
```

**⚠️ 주의**: 
- `your-project-ref`를 실제 프로젝트 ID로 변경
- `YOUR_ANON_KEY`를 실제 Anon Key로 변경

### 방법 B: Edge Function 내장 Cron (권장)

Edge Function 파일에 직접 Cron 스케줄을 명시합니다.

**파일**: `supabase/functions/update-visitor-stats-cache/index.ts`

이미 파일 상단에 추가되어 있습니다:

```typescript
// @ts-nocheck
// @cron: */30 * * * *
// 방문자 통계 캐시 업데이트 Edge Function (30분마다 실행)
```

✅ **이미 설정 완료**

---

## 📋 3단계: Edge Function 배포

### 3-1. Supabase CLI 설치 (미설치 시)

```bash
npm install -g supabase
```

### 3-2. 프로젝트 링크

```bash
cd hokex-front
supabase link --project-ref your-project-ref
```

### 3-3. Edge Function 배포

```bash
supabase functions deploy update-visitor-stats-cache
```

### 3-4. 환경 변수 설정

Supabase Dashboard → Edge Functions → update-visitor-stats-cache → Settings:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📋 4단계: 검증

### 4-1. 수동 실행 테스트

```bash
# 오늘 방문자 수만 업데이트
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "today"}'

# 전체 통계 업데이트
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "full"}'
```

### 4-2. 시간대 검증

Supabase SQL Editor에서 실행:

```sql
-- check-timezone-issue.sql 파일 실행
```

예상 결과:
- visit_hour: 12 (낮 12시에 방문했다면)
- 생성시각(KST): 2026-06-02 12:xx:xx

❌ 잘못된 경우:
- visit_hour: 2 (UTC 기준 새벽 2시로 저장됨)
- 생성시각(KST): 2026-06-02 12:xx:xx

---

## 🎯 완료 체크리스트

- [ ] `fix-timezone-and-cron.sql` 실행
- [ ] Edge Function에 `@cron: */30 * * * *` 주석 추가
- [ ] Edge Function 배포
- [ ] 환경 변수 설정
- [ ] 수동 실행 테스트
- [ ] 시간대 검증 (visit_hour가 KST 기준인지 확인)
- [ ] 30분 후 캐시가 자동 업데이트되는지 확인

---

## 🔍 트러블슈팅

### 문제 1: Cron이 실행되지 않음

**원인**: Edge Function Cron은 Supabase가 자동으로 호출하는 기능이 아닐 수 있습니다.

**해결책**: pg_cron 방법(방법 A) 사용 또는 외부 Cron 서비스 사용
- GitHub Actions (무료, 5분마다 가능)
- Vercel Cron (무료, Hobby 플랜은 1일 1회)
- Cron-job.org (무료, 1분마다 가능)

### 문제 2: 시간대가 여전히 UTC로 저장됨

**진단**:

```sql
SELECT 
  visit_hour,
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') as actual_kst_hour
FROM visitor_stats
WHERE created_at > NOW() - INTERVAL '1 hour';
```

- `visit_hour != actual_kst_hour`: 프론트엔드에서 UTC를 전송하고 있음
- `visit_hour = actual_kst_hour`: 정상 (KST 저장됨)

**해결책**: `detailedAnalytics.ts` 67-70번 줄 KST 변환 로직 재확인

### 문제 3: 캐시가 업데이트되지 않음

**진단**:

```sql
SELECT 
  cache_key,
  today,
  yesterday,
  updated_at,
  updated_at AT TIME ZONE 'Asia/Seoul' as updated_at_kst,
  NOW() - updated_at as "마지막 업데이트 후 경과시간"
FROM visitor_stats_cache
WHERE cache_key = 'summary';
```

**해결책**: 
1. Edge Function 로그 확인 (Supabase Dashboard → Edge Functions → Logs)
2. 수동으로 Edge Function 호출하여 작동 여부 확인
3. 권한 문제 확인 (SECURITY DEFINER 설정)

---

## 📌 권장 설정

### 최종 권장 방식: GitHub Actions Cron

**이유**:
- 무료
- 안정적
- 5분 간격 실행 가능
- Supabase Pro 플랜 불필요

**설정 파일**: `.github/workflows/update-visitor-cache.yml`

```yaml
name: Update Visitor Stats Cache

on:
  schedule:
    # 매 30분마다 (00분, 30분)
    - cron: '0,30 * * * *'
    # 새벽 4시 (KST 4시 = UTC 19시)
    - cron: '0 19 * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  update-cache:
    runs-on: ubuntu-latest
    steps:
      - name: Update Today Stats (30분마다)
        if: github.event_name == 'schedule' && github.event.schedule == '0,30 * * * *'
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/update-visitor-stats-cache' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{"type": "today"}'
      
      - name: Update Full Stats (새벽 4시)
        if: github.event_name == 'schedule' && github.event.schedule == '0 19 * * *'
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/update-visitor-stats-cache' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{"type": "full"}'
```

**GitHub Secrets 설정**:
- `SUPABASE_URL`: https://your-project-ref.supabase.co
- `SUPABASE_ANON_KEY`: your-anon-key

---

## ✅ 완료!

이제 방문자 통계가 다음과 같이 작동합니다:

1. ✅ **30분마다**: 오늘 방문자 수만 업데이트 (빠름)
2. ✅ **새벽 4시**: 전체 통계 업데이트 (정확함)
3. ✅ **시간대**: KST 기준으로 저장 및 표시

**확인 방법**:
- 지금 사이트 방문 → 관리자 페이지 → 시간대별 통계 확인
- 현재 시간(낮 12시)에 방문 기록이 "12시"로 표시되는지 확인
