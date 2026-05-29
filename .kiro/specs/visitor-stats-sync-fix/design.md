# Visitor Stats Synchronization - Design

## 아키텍처 개요

```
┌─────────────────┐
│  사용자 방문    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ recordDetailedVisit()       │
│ (프론트엔드)                │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ increment_visitor_stat()    │
│ (RPC 함수)                  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ visitor_stats 테이블        │
│ (원본 데이터)               │
└────────┬────────────────────┘
         │
         ▼ (트리거 자동 실행)
┌─────────────────────────────┐
│ update_visitor_stats_cache()│
│ (캐시 업데이트 함수)        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ visitor_stats_cache 테이블  │
│ (집계 캐시)                 │
└────────┬────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │관리자  │    │홈페이지│    │ API    │
    └────────┘    └────────┘    └────────┘
```

## 데이터베이스 스키마

### visitor_stats (원본 데이터)
```sql
CREATE TABLE visitor_stats (
  id UUID PRIMARY KEY,
  visit_date DATE NOT NULL,
  visit_hour INTEGER NOT NULL,
  visit_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(visit_date, visit_hour)
);
```

### visitor_stats_cache (집계 캐시)
```sql
CREATE TABLE visitor_stats_cache (
  cache_key TEXT PRIMARY KEY,
  today INTEGER NOT NULL,
  yesterday INTEGER NOT NULL,
  last_7_days INTEGER NOT NULL,
  last_30_days INTEGER NOT NULL,
  last_update_business_date DATE,
  updated_at TIMESTAMPTZ
);
```

## 핵심 컴포넌트

### 1. 비즈니스 날짜 계산 함수
```sql
get_business_date(ts TIMESTAMPTZ) RETURNS DATE
```
- 새벽 4시 기준으로 날짜 구분
- 0시~3시59분 → 전날
- 4시~23시59분 → 당일

### 2. 캐시 업데이트 함수
```sql
update_visitor_stats_cache() 
RETURNS TABLE(today, yesterday, last_7_days, last_30_days, business_date)
```
- visitor_stats에서 집계 계산
- visitor_stats_cache 업데이트
- 결과 반환

### 3. 자동 트리거
```sql
CREATE TRIGGER auto_update_visitor_cache
AFTER INSERT OR UPDATE ON visitor_stats
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_visitor_cache();
```
- 데이터 변경 시 즉시 캐시 업데이트

### 4. pg_cron 스케줄러
```sql
SELECT cron.schedule(
  'update-visitor-stats-cache',
  '* * * * *',  -- 1분마다
  $$SELECT update_visitor_stats_cache();$$
);
```
- 1분마다 캐시 재계산
- 혹시 모를 불일치 방지

## 동기화 메커니즘

### 실시간 동기화
1. 사용자 방문 → `increment_visitor_stat()` 호출
2. `visitor_stats` 테이블 업데이트
3. 트리거 자동 실행 → 캐시 업데이트
4. 모든 페이지에서 동일한 값 조회

### 주기적 동기화
- 1분마다 pg_cron이 캐시 재계산
- 트리거 누락 시에도 최대 1분 지연

## 에러 처리

### 함수 교체 시
```sql
DROP FUNCTION IF EXISTS update_visitor_stats_cache() CASCADE;
```
- CASCADE로 의존성까지 삭제
- 반환 타입 변경 시 에러 방지

### 스케줄 삭제 시
```sql
DO $$
BEGIN
  PERFORM cron.unschedule('update-visitor-stats-cache');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
```
- 존재하지 않는 스케줄 삭제 시 에러 무시

## RLS (Row Level Security)

### visitor_stats
- Public: SELECT 허용
- Service Role: 모든 작업 허용

### visitor_stats_cache
- Public: SELECT 허용
- Service Role: 모든 작업 허용

## 성능 최적화

1. **캐시 사용**: 매번 집계 계산 대신 캐시 조회
2. **인덱스**: (visit_date, visit_hour) UNIQUE 제약
3. **트리거**: STATEMENT 레벨로 배치 처리
4. **주기적 재계산**: 1분 간격으로 부하 분산
