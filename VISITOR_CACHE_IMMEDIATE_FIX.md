# 방문객 통계 즉시 수정 가이드

## 현재 상황
- **로컬**: 정상 작동 (실시간 DB 조회, KST 기준)
- **배포**: 0명 표시 (캐시가 오래됨, Edge Function이 UTC 날짜로 조회)

## 문제 원인
Edge Function `update-visitor-stats-cache`가 UTC 날짜로 DB를 조회했지만, 프론트엔드는 KST 날짜로 방문 기록을 저장함 → 날짜 불일치로 데이터를 찾지 못함

## ✅ 이미 수정된 사항
Edge Function 코드가 KST 기준으로 수정됨 (`index.ts`에서 `kstOffset` 추가)

---

## 🚀 즉시 실행할 작업

### 1단계: Edge Function 재배포 (필수)

```bash
cd hokex-front
supabase functions deploy update-visitor-stats-cache
```

**예상 출력:**
```
Deploying function update-visitor-stats-cache...
Function deployed successfully!
```

### 2단계: 캐시 즉시 업데이트 (필수)

**방법 A - SQL 직접 실행 (추천)**

Supabase Dashboard → SQL Editor에서 `force-update-visitor-cache-now.sql` 파일 내용 실행

**방법 B - Edge Function 직접 호출**

```bash
# YOUR_PROJECT_REF와 YOUR_ANON_KEY를 실제 값으로 변경
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}'
```

### 3단계: 결과 확인 (필수)

Supabase Dashboard → SQL Editor에서 `diagnose-visitor-cache.sql` 실행

**확인할 내용:**
- 캐시의 `today`, `yesterday` 값이 0이 아닌지
- 실제 DB의 오늘/어제 데이터와 일치하는지
- `cache_age`가 1분 이내인지

### 4단계: 프론트엔드에서 확인 (필수)

배포된 사이트(https://hokex.vercel.app)에서:
1. 홈페이지 방문
2. 화면 하단 "오늘 방문객" 확인
3. 숫자가 0이 아닌지 확인

---

## 🔧 자동 업데이트 설정 (권장)

캐시가 자동으로 업데이트되도록 pg_cron 스케줄 설정:

```sql
-- 30분마다: 오늘 방문자 수만 업데이트 (빠름)
SELECT cron.schedule(
  'update-visitor-cache-today',
  '*/30 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"type":"today"}'::jsonb
  );
  $$
);

-- 새벽 4시(KST): 전체 통계 업데이트
SELECT cron.schedule(
  'update-visitor-cache-full',
  '0 19 * * *', -- UTC 19:00 = KST 04:00
  $$ 
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"type":"full"}'::jsonb
  );
  $$
);
```

**주의:** `YOUR_PROJECT_REF`와 `YOUR_SERVICE_KEY`를 실제 값으로 변경

---

## 📊 실제 데이터 확인 (참고용)

오늘과 어제의 실제 방문자 수를 확인하려면:

```sql
-- KST 기준 오늘/어제 실제 방문자 수
WITH kst_dates AS (
  SELECT 
    (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE as today,
    ((NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::DATE as yesterday
)
SELECT 
  '오늘' as period,
  kst_dates.today as date,
  COALESCE(SUM(vs.visit_count), 0) as total_visits
FROM kst_dates
LEFT JOIN visitor_stats vs ON vs.visit_date = kst_dates.today
GROUP BY kst_dates.today

UNION ALL

SELECT 
  '어제' as period,
  kst_dates.yesterday as date,
  COALESCE(SUM(vs.visit_count), 0) as total_visits
FROM kst_dates
LEFT JOIN visitor_stats vs ON vs.visit_date = kst_dates.yesterday
GROUP BY kst_dates.yesterday;
```

---

## ⚠️ 문제 해결

### 여전히 0이 나오는 경우

**1. visitor_stats 테이블에 데이터가 있는지 확인**

```sql
SELECT 
  visit_date,
  visit_hour,
  visit_count
FROM visitor_stats
WHERE visit_date >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '3 days'
ORDER BY visit_date DESC, visit_hour DESC
LIMIT 20;
```

**데이터가 없으면:**
- 프론트엔드의 `recordDetailedVisit()` 함수가 실행되지 않음
- RPC 함수 `increment_visitor_stat` 확인 필요

**2. RPC 함수 테스트**

```sql
-- 테스트 호출
SELECT increment_visitor_stat(
  p_visit_date := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE,
  p_visit_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'))::INTEGER
);

-- 결과 확인
SELECT * FROM visitor_stats 
WHERE visit_date = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::DATE
ORDER BY visit_hour DESC;
```

---

## ✅ 완료 체크리스트

- [ ] 1단계: Edge Function 재배포 완료
- [ ] 2단계: 캐시 수동 업데이트 완료
- [ ] 3단계: SQL로 캐시 데이터 확인 (0이 아님)
- [ ] 4단계: 배포 사이트에서 실제 숫자 확인
- [ ] 선택: pg_cron 자동 업데이트 스케줄 설정
- [ ] 선택: visitor_stats 테이블에 최근 데이터 존재 확인

---

## 📝 참고 파일

- `supabase/functions/update-visitor-stats-cache/index.ts` - Edge Function (KST 적용됨)
- `force-update-visitor-cache-now.sql` - 캐시 즉시 업데이트
- `diagnose-visitor-cache.sql` - 진단 쿼리
- `src/utils/detailedAnalytics.ts` - 프론트엔드 방문 기록 (KST 사용)

---

## 🎯 예상 결과

**수정 전:**
- 오늘: 0명
- 어제: 0명

**수정 후:**
- 오늘: 실제 방문자 수 (예: 5명)
- 어제: 실제 방문자 수 (예: 1명)
- 최근 7일: 실제 누적 수

---

**작업 시간:** 약 5-10분
**난이도:** 쉬움 (명령어 복사/붙여넣기)
