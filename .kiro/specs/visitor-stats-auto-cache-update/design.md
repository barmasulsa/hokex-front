# Visitor Stats Auto Cache Update - Design

## 시스템 아키텍처

### 개요
Supabase Free Tier의 `pg_cron` 제약을 우회하기 위해 GitHub Actions 스케줄러를 활용한 외부 트리거 방식의 캐시 업데이트 시스템

### 아키�ecture 다이어그램
```
┌─────────────────────┐
│  GitHub Actions     │
│  (Scheduler)        │
│  - Cron: */30 * * * │
└──────────┬──────────┘
           │ HTTP POST (30분마다)
           │ Authorization: Bearer ${SUPABASE_ANON_KEY}
           ▼
┌─────────────────────────────────────┐
│  Supabase Edge Function             │
│  update-visitor-stats-cache         │
│  - KST 타임존 처리                    │
│  - 날짜 계산 (오늘, 어제, 7일, 30일)   │
│  - 집계 쿼리 실행                     │
└──────────┬──────────────────────────┘
           │ SQL Queries (KST)
           ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│                                     │
│  ┌──────────────────┐               │
│  │ visitor_stats    │               │
│  │ (원본 데이터)       │               │
│  │ - visit_date     │               │
│  │ - visit_hour     │               │
│  │ - visit_count    │               │
│  └──────────────────┘               │
│           │                         │
│           │ Aggregate (SUM)         │
│           ▼                         │
│  ┌──────────────────┐               │
│  │visitor_stats_cache│              │
│  │ (집계 캐시)         │               │
│  │ - today          │               │
│  │ - yesterday      │               │
│  │ - last_7_days    │               │
│  │ - last_30_days   │               │
│  │ - total_visits   │               │
│  └──────────────────┘               │
└─────────────────────────────────────┘
           │ Query (anon key)
           ▼
┌─────────────────────────────────────┐
│  Frontend (Vercel)                  │
│  - 캐시 데이터 조회                    │
│  - 실시간 표시                        │
└─────────────────────────────────────┘
```

## 컴포넌트 설계

### 1. GitHub Actions Workflow
**파일**: `.github/workflows/update-visitor-cache-debug.yml`

```yaml
name: Update Visitor Cache (Auto + Manual)

on:
  schedule:
    - cron: '*/30 * * * *'  # 30분마다 실행
  workflow_dispatch:         # 수동 실행 지원

jobs:
  update-cache:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/update-visitor-stats-cache" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

**역할**:
- 30분마다 자동 실행 (GitHub Actions 스케줄러)
- Edge Function HTTP 엔드포인트 호출
- 수동 실행 지원 (workflow_dispatch)

### 2. Supabase Edge Function
**파일**: `supabase/functions/update-visitor-stats-cache/index.ts`

**핵심 로직**:
```typescript
// KST 타임존으로 현재 날짜 계산
const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
const today = kstNow.toISOString().split('T')[0];

// 날짜 범위 계산
const yesterday = new Date(kstNow.getTime() - 24*60*60*1000).toISOString().split('T')[0];
const last7DaysStart = new Date(kstNow.getTime() - 7*24*60*60*1000).toISOString().split('T')[0];
const last30DaysStart = new Date(kstNow.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];

// 집계 쿼리 실행
const todayCount = await supabase
  .from('visitor_stats')
  .select('visit_count.sum()')
  .eq('visit_date', today);

// 캐시 업데이트 (UPSERT)
await supabase
  .from('visitor_stats_cache')
  .upsert({
    cache_key: 'summary',
    today: todayCount,
    yesterday: yesterdayCount,
    last_7_days: last7DaysCount,
    last_30_days: last30DaysCount,
    total_visits: totalCount,
    updated_at: new Date().toISOString()
  });
```

**역할**:
- KST 타임존 기준 날짜 계산
- `visitor_stats` 테이블에서 집계
- `visitor_stats_cache` 테이블 업데이트

### 3. Database Schema

#### visitor_stats (원본)
```sql
CREATE TABLE visitor_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_date DATE NOT NULL,
  visit_hour INTEGER NOT NULL CHECK (visit_hour >= 0 AND visit_hour <= 23),
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visitor_stats_date ON visitor_stats(visit_date);
CREATE INDEX idx_visitor_stats_date_hour ON visitor_stats(visit_date, visit_hour);
```

#### visitor_stats_cache (캐시)
```sql
CREATE TABLE visitor_stats_cache (
  cache_key TEXT PRIMARY KEY DEFAULT 'summary',
  today INTEGER DEFAULT 0,
  yesterday INTEGER DEFAULT 0,
  last_7_days INTEGER DEFAULT 0,
  last_30_days INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 데이터 플로우

### 정상 흐름 (Happy Path)
```
1. GitHub Actions Cron 트리거 (매 30분)
   ↓
2. HTTP POST → Edge Function
   ↓
3. Edge Function: KST 타임존으로 날짜 계산
   ↓
4. SQL 집계 쿼리 실행
   - SELECT SUM(visit_count) FROM visitor_stats WHERE visit_date = '2026-06-05'
   ↓
5. visitor_stats_cache 테이블 UPSERT
   - cache_key='summary' 레코드 업데이트
   ↓
6. HTTP 200 응답 반환
   ↓
7. Frontend: 최신 캐시 데이터 조회 및 표시
```

### 오류 처리 흐름
```
1. GitHub Actions HTTP 요청 실패
   ↓
2. 다음 스케줄(30분 후) 재시도
   ↓
3. Edge Function 내부 오류
   ↓
4. HTTP 500 응답 + 오류 로그
   ↓
5. GitHub Actions 로그에 기록
```

## 시퀀스 다이어그램

```
┌────────┐         ┌──────────┐         ┌────────────┐         ┌──────────┐
│ Cron   │         │  GitHub  │         │   Edge     │         │   DB     │
│        │         │ Actions  │         │  Function  │         │          │
└───┬────┘         └────┬─────┘         └─────┬──────┘         └────┬─────┘
    │                   │                     │                     │
    │ */30 * * * *      │                     │                     │
    │──────────────────>│                     │                     │
    │                   │                     │                     │
    │                   │ POST /functions/v1/update-visitor-stats-cache
    │                   │────────────────────>│                     │
    │                   │                     │                     │
    │                   │                     │ Calculate KST dates │
    │                   │                     │─┐                   │
    │                   │                     │ │                   │
    │                   │                     │<┘                   │
    │                   │                     │                     │
    │                   │                     │ SELECT SUM(visit_count)
    │                   │                     │────────────────────>│
    │                   │                     │                     │
    │                   │                     │   Result (1)        │
    │                   │                     │<────────────────────│
    │                   │                     │                     │
    │                   │                     │ UPSERT cache        │
    │                   │                     │────────────────────>│
    │                   │                     │                     │
    │                   │                     │   Success           │
    │                   │                     │<────────────────────│
    │                   │                     │                     │
    │                   │   HTTP 200          │                     │
    │                   │<────────────────────│                     │
    │                   │                     │                     │
```

## 설정 및 환경변수

### GitHub Secrets
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: 공개 API 키 (Edge Function 호출용)
- `SUPABASE_SERVICE_KEY`: 서비스 롤 키 (사용되지 않음, 보관만)

### Edge Function 환경
- Runtime: Deno
- Timeout: 60초
- Memory: 512MB

## 타임존 처리

### KST (UTC+9) 기준 날짜 계산
```typescript
// ❌ 잘못된 방법 (UTC 기준)
const today = new Date().toISOString().split('T')[0];

// ✅ 올바른 방법 (KST 기준)
const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
const today = kstNow.toISOString().split('T')[0];
```

### 날짜 범위 예시 (2026-06-05 기준)
- `today`: 2026-06-05
- `yesterday`: 2026-06-04
- `last_7_days`: 2026-05-29 ~ 2026-06-05
- `last_30_days`: 2026-05-06 ~ 2026-06-05

## 성능 고려사항

### 인덱스 최적화
```sql
-- 날짜 기반 조회 최적화
CREATE INDEX idx_visitor_stats_date ON visitor_stats(visit_date);
```

### 집계 쿼리 성능
- 예상 실행 시간: < 100ms (1만 레코드 기준)
- 캐시 테이블 크기: 1개 레코드 (cache_key='summary')

### Edge Function 성능
- Cold start: 1-2초
- Warm execution: 100-300ms

## 보안 고려사항

### 인증
- GitHub Actions → Edge Function: `SUPABASE_ANON_KEY` 사용
- Edge Function → Database: Supabase 내부 인증 (Service Role)

### RLS (Row Level Security)
- `visitor_stats`: SELECT 권한 (anon)
- `visitor_stats_cache`: SELECT 권한 (anon), UPSERT 권한 (service_role)

## 확장 가능성

### 미래 개선 사항
1. **Supabase Pro 업그레이드 시**
   - GitHub Actions 대신 `pg_cron` 사용 가능
   - DB 내부에서 직접 스케줄링

2. **실시간 업데이트**
   - Supabase Realtime 구독으로 즉시 반영
   - 현재: 최대 30분 지연

3. **더 세밀한 캐시**
   - 시간대별 방문자 수
   - 지역별, 디바이스별 통계

## 배포 및 롤백

### 배포
1. GitHub Actions 워크플로우 파일 수정
2. Git push → 자동 반영
3. 수동 실행으로 즉시 테스트

### 롤백
1. Git revert 후 push
2. 또는 GitHub Actions UI에서 워크플로우 비활성화

## 모니터링

### 성공 확인
```sql
-- 캐시 업데이트 시간 확인
SELECT updated_at FROM visitor_stats_cache WHERE cache_key = 'summary';

-- 최신 데이터 확인
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';
```

### GitHub Actions 로그
- Actions 탭에서 실행 히스토리 확인
- HTTP 응답 코드 및 메시지 확인
