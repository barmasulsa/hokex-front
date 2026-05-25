# 조회 로그 시스템 구축 가이드

## 문제 상황

기존 시스템은 `events.view_count`에 누적 조회수만 저장하여 **언제** 조회가 발생했는지 알 수 없었습니다.
따라서 기간별 통계(오늘, 이번 주, 이번 달)를 제대로 구현할 수 없었습니다.

## 해결 방법

조회 로그 테이블(`event_views_log`)을 생성하여 모든 조회 이벤트를 기록합니다.

## 1단계: 마이그레이션 적용

```bash
# Supabase SQL Editor에서 실행
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres -f supabase-migrations/create-event-views-log.sql
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres -f supabase-migrations/update-visitor-stats-with-period-filter.sql
```

또는 Supabase Dashboard > SQL Editor에서 파일 내용을 복사하여 실행합니다.

## 2단계: 프론트엔드 코드 수정

### 조회수 증가 함수 수정

기존:
```typescript
await supabase.rpc('increment_event_view_count', { 
  p_event_id: eventId 
});
```

신규 (IP, User Agent 포함):
```typescript
await supabase.rpc('increment_event_view_count', { 
  p_event_id: eventId,
  p_user_id: user?.id || null,
  p_ip_address: await getClientIP(), // 구현 필요
  p_user_agent: navigator.userAgent
});
```

### 기간별 인기 행사 조회

```typescript
// 오늘의 인기 행사
const { data: todayPopular } = await supabase.rpc('get_popular_events_by_period', {
  p_start_date: new Date().toISOString().split('T')[0],
  p_end_date: new Date().toISOString().split('T')[0],
  p_limit: 10
});

// 이번 주 인기 행사
const startOfWeek = new Date();
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(endOfWeek.getDate() + 6);

const { data: weeklyPopular } = await supabase.rpc('get_popular_events_by_period', {
  p_start_date: startOfWeek.toISOString().split('T')[0],
  p_end_date: endOfWeek.toISOString().split('T')[0],
  p_limit: 10
});

// 이번 달 인기 행사
const startOfMonth = new Date();
startOfMonth.setDate(1);
const endOfMonth = new Date(startOfMonth);
endOfMonth.setMonth(endOfMonth.getMonth() + 1);
endOfMonth.setDate(0);

const { data: monthlyPopular } = await supabase.rpc('get_popular_events_by_period', {
  p_start_date: startOfMonth.toISOString().split('T')[0],
  p_end_date: endOfMonth.toISOString().split('T')[0],
  p_limit: 10
});
```

### 일별 조회수 통계 (관리자 페이지용)

```typescript
const { data: dailyStats } = await supabase.rpc('get_daily_view_stats', {
  p_start_date: '2026-01-01',
  p_end_date: '2026-12-31'
});

// 결과:
// [
//   { view_date: '2026-01-01', total_views: 1234, unique_events: 56 },
//   { view_date: '2026-01-02', total_views: 2345, unique_events: 78 },
//   ...
// ]
```

## 3단계: 기존 데이터 마이그레이션 (선택사항)

기존 `view_count`를 로그로 변환하려면:

```sql
-- 주의: 정확한 조회 시각을 알 수 없으므로 임의의 시각으로 분산
INSERT INTO event_views_log (event_id, viewed_at)
SELECT 
  id as event_id,
  start_date + (random() * (end_date - start_date)) as viewed_at
FROM events
CROSS JOIN generate_series(1, COALESCE(view_count, 0)) as series
WHERE view_count > 0;
```

**권장하지 않음**: 기존 데이터는 정확한 조회 시각이 없으므로 새로운 조회부터 로그를 기록하는 것을 권장합니다.

## 데이터베이스 스키마

### event_views_log 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | 기본 키 |
| event_id | INTEGER | 조회된 행사 ID (FK) |
| viewed_at | TIMESTAMPTZ | 조회 시각 |
| user_id | UUID | 조회한 사용자 ID (선택) |
| ip_address | TEXT | 조회자 IP 주소 (선택) |
| user_agent | TEXT | 조회자 User Agent (선택) |
| created_at | TIMESTAMPTZ | 레코드 생성 시각 |

### 인덱스

- `idx_event_views_log_event_id`: event_id 조회 최적화
- `idx_event_views_log_viewed_at`: 날짜 범위 조회 최적화
- `idx_event_views_log_event_viewed`: 복합 조회 최적화

## 성능 고려사항

### 1. 로그 테이블 크기 관리

조회 로그는 빠르게 증가할 수 있습니다. 주기적으로 오래된 로그를 삭제하거나 아카이브하세요:

```sql
-- 1년 이상 된 로그 삭제
DELETE FROM event_views_log
WHERE viewed_at < NOW() - INTERVAL '1 year';
```

### 2. 파티셔닝 (대용량 트래픽 시)

월별 파티셔닝을 고려하세요:

```sql
-- 월별 파티션 테이블 생성 예시
CREATE TABLE event_views_log_2026_01 PARTITION OF event_views_log
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 3. 캐싱

인기 행사 목록은 자주 조회되므로 캐싱을 권장합니다:
- Redis 또는 Supabase Realtime 활용
- 5분~1시간 단위로 캐시 갱신

## 보안 고려사항

- IP 주소와 User Agent는 개인정보일 수 있으므로 개인정보 처리방침에 명시 필요
- GDPR 준수를 위해 사용자 요청 시 해당 사용자의 로그 삭제 기능 구현 권장

## 테스트

```sql
-- 조회 로그 추가 테스트
SELECT increment_event_view_count(1, NULL, '127.0.0.1', 'Test User Agent');

-- 오늘의 인기 행사 조회
SELECT * FROM get_popular_events_by_period(CURRENT_DATE, CURRENT_DATE, 10);

-- 일별 통계 조회
SELECT * FROM get_daily_view_stats('2026-01-01', '2026-12-31');
```

## 다음 단계

1. ✅ 조회 로그 테이블 생성
2. ✅ 기간별 통계 함수 생성
3. ⬜ 프론트엔드 코드 수정 (increment_event_view_count 호출 부분)
4. ⬜ 관리자 페이지에 통계 대시보드 추가
5. ⬜ 로그 정리 스케줄러 설정 (선택)
