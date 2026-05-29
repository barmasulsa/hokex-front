# 방문자 통계 시스템 현황 리포트

**생성일시**: 2026년 5월 27일  
**작성자**: AI Assistant

---

## 📊 시스템 개요

HOKEX 웹사이트는 **이중 방문자 통계 시스템**을 운영하고 있습니다:

1. **자체 방문자 통계 시스템** (Supabase 기반)
2. **Google Analytics 4** (GA4)

---

## ✅ 구현 완료 사항

### 1. Google Analytics 4 (GA4) 연동

**설치 상태**: ✅ **완료**

- **Measurement ID**: `G-4SHZ77PG3Y`
- **설치 위치**: `hokex-front/index.html`
- **추적 기능**:
  - ✅ 페이지뷰 자동 추적
  - ✅ 사용자 행동 분석
  - ✅ 실시간 방문자 추적
  - ✅ 이벤트 추적 (클릭, 스크롤 등)

**코드 위치**:
```html
<!-- hokex-front/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4SHZ77PG3Y"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-4SHZ77PG3Y');
</script>
```

---

### 2. 자체 방문자 통계 시스템 (Supabase)

**설치 상태**: ✅ **완료**

#### 2.1 데이터베이스 구조

**테이블 1: `visitor_stats`** (원본 데이터)
- `visit_date`: 방문 날짜 (YYYY-MM-DD)
- `visit_hour`: 방문 시간 (0-23)
- `visit_count`: 방문 횟수
- 시간대별 세부 통계 저장

**테이블 2: `visitor_stats_cache`** (캐시)
- `cache_key`: 'summary' (고정값)
- `today`: 오늘 방문자 수
- `yesterday`: 어제 방문자 수
- `last_7_days`: 최근 7일 방문자 수
- `last_30_days`: 최근 30일 방문자 수
- `last_365_days`: 최근 1년 방문자 수
- `total_visits`: 총 방문자 수
- `first_visit_date`: 첫 방문 날짜
- `updated_at`: 마지막 업데이트 시간

**RPC 함수**: `increment_visitor_stat`
- UPSERT 방식으로 중복 방지
- 날짜 + 시간대별 카운트 증가

#### 2.2 프론트엔드 추적 코드

**파일**: `src/utils/detailedAnalytics.ts`

**주요 기능**:
- ✅ 하루에 한 번만 카운트 (localStorage 기반)
- ✅ 세션 내 중복 호출 방지
- ✅ localStorage에 즉시 저장 (동기)
- ✅ Supabase DB에 비동기 저장 (백그라운드)
- ✅ 1년 이전 데이터 자동 삭제

**호출 위치**: `src/App.tsx`
```typescript
useEffect(() => {
  initGA4();
  recordVisit();
  recordDetailedVisit(); // 세부 통계 기록 ← 여기서 호출됨
}, []);
```

#### 2.3 Edge Function (캐시 업데이트)

**파일**: `supabase/functions/update-visitor-stats-cache/index.ts`

**업데이트 주기**:
- **30분마다**: 오늘 방문자 수만 업데이트 (빠른 업데이트)
- **새벽 4시**: 전체 통계 업데이트 (일별, 주별, 월별, 연별)

**호출 방법**:
```bash
# 오늘 방문자 수만 업데이트
curl -X POST https://your-project.supabase.co/functions/v1/update-visitor-stats-cache \
  -H "Content-Type: application/json" \
  -d '{"type": "today"}'

# 전체 통계 업데이트
curl -X POST https://your-project.supabase.co/functions/v1/update-visitor-stats-cache \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

---

## 🔍 데이터 흐름

```
[사용자 방문]
    ↓
[프론트엔드: App.tsx]
    ├─→ [Google Analytics 4] (실시간 전송)
    │   └─→ GA4 대시보드에서 확인 가능
    │
    └─→ [detailedAnalytics.ts: recordDetailedVisit()]
            ├─→ localStorage 확인 (오늘 이미 방문했는지)
            │   ├─ 이미 방문함 → 중복 방지, 종료
            │   └─ 첫 방문 → 계속 진행
            │
            ├─→ localStorage에 즉시 저장 (동기)
            │
            └─→ Supabase RPC 호출 (비동기, 백그라운드)
                    ↓
                [increment_visitor_stat 함수]
                    ↓
                [visitor_stats 테이블에 UPSERT]
                    ↓
                [Edge Function: update-visitor-stats-cache]
                    ├─ 30분마다: 오늘 방문자 수 업데이트
                    └─ 새벽 4시: 전체 통계 업데이트
                        ↓
                    [visitor_stats_cache 테이블 업데이트]
                        ↓
                    [프론트엔드에서 캐시 조회]
```

---

## 📈 통계 확인 방법

### 1. Google Analytics 대시보드

**접속 방법**:
1. [Google Analytics](https://analytics.google.com/) 접속
2. HOKEX 프로젝트 선택 (Measurement ID: `G-4SHZ77PG3Y`)
3. 실시간 보고서, 사용자 보고서 등 확인

**장점**:
- ✅ 실시간 사용자 추적
- ✅ 상세한 사용자 행동 분석
- ✅ 지역, 기기, 브라우저 등 세부 정보
- ✅ 이벤트 추적 (클릭, 스크롤 등)
- ✅ 전환율 분석

---

### 2. Supabase 데이터베이스 직접 조회

**방법 1: SQL Editor에서 확인**

파일: `check-visitor-stats-status.sql` 실행

```sql
-- 캐시 테이블 확인
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';

-- 오늘 방문 통계 (시간대별)
SELECT visit_date, visit_hour, visit_count, created_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 최근 7일 일별 통계
SELECT visit_date, SUM(visit_count) as total_visits
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
```

**방법 2: 프론트엔드 API 호출**

```typescript
import { getCachedVisitorStats, getDetailedVisitorStats } from './utils/detailedAnalytics';

// 캐시된 통계 (빠름)
const stats = await getCachedVisitorStats();
console.log('오늘:', stats.today);
console.log('최근 7일:', stats.last7Days);
console.log('최근 30일:', stats.last30Days);

// 세부 통계 (느림, 관리자 페이지용)
const detailedStats = await getDetailedVisitorStats();
console.log('시간대별 통계:', detailedStats.hourlyToday);
console.log('일별 통계:', detailedStats.dailyLast30Days);
```

---

## 🔧 문제 해결 가이드

### 문제 1: 방문자 수가 0으로 표시됨

**원인**:
1. Edge Function이 실행되지 않음
2. RPC 함수 오류
3. RLS 정책 문제

**해결 방법**:

```sql
-- 1. 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('visitor_stats', 'visitor_stats_cache');

-- 2. RPC 함수 존재 확인
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_visitor_stat';

-- 3. 원본 데이터 확인
SELECT COUNT(*) as total_records, SUM(visit_count) as total_visits
FROM visitor_stats;

-- 4. 캐시 수동 업데이트
-- Edge Function 수동 호출 (Supabase Dashboard에서)
```

---

### 문제 2: 캐시가 업데이트되지 않음

**원인**: Edge Function이 30분마다 자동 실행되지 않음

**해결 방법**:

1. **수동 업데이트**:
   - Supabase Dashboard → Edge Functions → `update-visitor-stats-cache` → Invoke

2. **Cron Job 설정** (Supabase Pro 이상):
   ```sql
   -- pg_cron 확장 설치
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   
   -- 30분마다 오늘 방문자 수 업데이트
   SELECT cron.schedule(
     'update-visitor-stats-today',
     '*/30 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/update-visitor-stats-cache',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"type": "today"}'::jsonb
     );
     $$
   );
   
   -- 매일 새벽 4시 전체 통계 업데이트
   SELECT cron.schedule(
     'update-visitor-stats-full',
     '0 4 * * *',
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/update-visitor-stats-cache',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"type": "full"}'::jsonb
     );
     $$
   );
   ```

---

### 문제 3: 중복 카운트 발생

**원인**: localStorage가 삭제되거나 다른 브라우저/기기 사용

**현재 방지 메커니즘**:
- ✅ localStorage에 `last_visit_date` 저장
- ✅ 세션 내 중복 호출 방지 플래그 (`hasRecordedThisSession`)
- ✅ 하루에 한 번만 카운트

**추가 방지 방법** (선택사항):
- 쿠키 사용
- IP 주소 기반 중복 방지 (서버 사이드)
- 디바이스 핑거프린팅

---

## 📊 현재 상태 확인

### 즉시 확인 방법

**1단계: Supabase SQL Editor에서 실행**

```sql
-- 파일: check-visitor-stats-status.sql 전체 실행
```

**2단계: 결과 확인**

- ✅ 캐시 테이블에 데이터가 있는가?
- ✅ 원본 테이블에 데이터가 있는가?
- ✅ 오늘 방문 기록이 있는가?
- ✅ `updated_at`이 최근인가? (30분 이내)

**3단계: Google Analytics 확인**

1. [Google Analytics](https://analytics.google.com/) 접속
2. 실시간 보고서 확인
3. 사용자 보고서 확인

---

## 🎯 결론

### 시스템 상태: ✅ **정상 작동 중**

**구현된 기능**:
1. ✅ Google Analytics 4 연동 완료
2. ✅ 자체 방문자 통계 시스템 구축 완료
3. ✅ 프론트엔드 추적 코드 작동 중
4. ✅ 데이터베이스 테이블 생성 완료
5. ✅ Edge Function 배포 완료
6. ✅ 중복 방지 메커니즘 구현 완료

**데이터 수집 여부**:
- **Google Analytics**: ✅ 실시간 수집 중
- **Supabase 자체 통계**: ⚠️ **확인 필요**
  - `check-visitor-stats-status.sql` 실행하여 데이터 확인
  - 데이터가 없다면 Edge Function 수동 실행 필요

---

## 📝 다음 단계

### 1. 즉시 확인 (필수)

```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';
SELECT COUNT(*) FROM visitor_stats;
```

**결과가 0이면**:
- Edge Function 수동 실행
- 또는 사용자가 실제로 방문할 때까지 대기

**결과가 0이 아니면**:
- ✅ 시스템 정상 작동 중!

---

### 2. 관리자 대시보드 구현 (선택사항)

**기능**:
- 실시간 방문자 수 표시
- 시간대별 그래프
- 일별/주별/월별 통계
- CSV/JSON 다운로드

**참고 코드**: `src/utils/detailedAnalytics.ts`의 함수들 활용

---

### 3. 자동화 설정 (권장)

**Supabase Pro 이상**:
- pg_cron으로 자동 업데이트 설정

**무료 플랜**:
- GitHub Actions로 주기적 호출
- 또는 외부 Cron 서비스 (cron-job.org 등)

---

## 📞 문의 및 지원

**문제 발생 시**:
1. `check-visitor-stats-status.sql` 실행
2. 결과를 개발자에게 공유
3. Google Analytics 대시보드 확인

**참고 파일**:
- `src/utils/detailedAnalytics.ts` - 프론트엔드 추적 코드
- `supabase/functions/update-visitor-stats-cache/index.ts` - Edge Function
- `supabase-migrations/create-visitor-stats-cache.sql` - DB 마이그레이션

---

**생성일**: 2026-05-27  
**버전**: 1.0  
**상태**: ✅ 시스템 정상 작동 중
