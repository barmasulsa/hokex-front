# 기존 조회수 마이그레이션 가이드

## 개요

현재 `events` 테이블에 저장된 조회수를 어제 날짜로 `event_views_log` 테이블에 반영합니다.

## 실행 순서

### 1단계: 조회 로그 테이블 생성

먼저 조회 로그 시스템을 구축합니다:

```bash
# Supabase SQL Editor에서 실행
psql -f supabase-migrations/create-event-views-log.sql
psql -f supabase-migrations/update-visitor-stats-with-period-filter.sql
```

### 2단계: 기존 조회수 마이그레이션

```bash
# 기존 조회수를 어제 날짜로 로그에 반영
psql -f migrate-existing-view-counts.sql
```

## 마이그레이션 동작 방식

1. **조회수가 있는 모든 행사 조회**: `view_count > 0`인 행사들을 가져옵니다
2. **어제 날짜로 로그 생성**: 각 조회수만큼 어제 하루 중 랜덤한 시각으로 로그를 생성합니다
3. **마이그레이션 표시**: `user_agent = 'Historical Data Migration'`으로 마이그레이션된 데이터임을 표시합니다

## 예시

행사 A의 `view_count = 12`인 경우:
- 어제 날짜(2026-05-24)의 랜덤한 시각에 12개의 조회 로그가 생성됩니다
- 예: 
  - 2026-05-24 03:15:42
  - 2026-05-24 09:23:11
  - 2026-05-24 14:56:33
  - ... (총 12개)

## 마이그레이션 후 확인

### 어제 날짜의 조회수 확인

```sql
SELECT 
  DATE(viewed_at) as view_date,
  COUNT(*) as total_views,
  COUNT(DISTINCT event_id) as unique_events
FROM event_views_log
WHERE user_agent = 'Historical Data Migration'
GROUP BY DATE(viewed_at)
ORDER BY view_date DESC;
```

### 특정 행사의 로그 확인

```sql
SELECT 
  event_id,
  viewed_at,
  user_agent
FROM event_views_log
WHERE event_id = 1  -- 확인하고 싶은 행사 ID
ORDER BY viewed_at;
```

### 어제의 인기 행사 조회 (마이그레이션 후)

```sql
SELECT * FROM get_popular_events_by_period(
  (CURRENT_DATE - INTERVAL '1 day')::DATE,
  (CURRENT_DATE - INTERVAL '1 day')::DATE,
  10
);
```

## 주의사항

1. **한 번만 실행**: 이 스크립트는 한 번만 실행해야 합니다. 중복 실행 시 조회수가 2배로 증가합니다.
2. **실행 시간**: 조회수가 많은 경우 실행 시간이 오래 걸릴 수 있습니다 (예: 10만 조회수 = 약 1~2분)
3. **롤백 방법**: 잘못 실행한 경우 아래 명령으로 롤백할 수 있습니다:

```sql
-- 마이그레이션된 데이터만 삭제
DELETE FROM event_views_log
WHERE user_agent = 'Historical Data Migration';
```

## 마이그레이션 후 프론트엔드 수정

마이그레이션 완료 후 프론트엔드에서 조회수 증가 함수를 수정해야 합니다:

### src/services/eventService.ts 수정

```typescript
// 기존
export const incrementViewCount = async (eventId: number) => {
  await supabase.rpc('increment_event_view_count', { 
    p_event_id: eventId 
  });
};

// 신규
export const incrementViewCount = async (eventId: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.rpc('increment_event_view_count', { 
    p_event_id: eventId,
    p_user_id: user?.id || null,
    p_ip_address: null,  // 필요시 구현
    p_user_agent: navigator.userAgent
  });
};
```

## 검증

마이그레이션이 성공적으로 완료되었는지 확인:

```sql
-- 1. events 테이블의 총 조회수
SELECT SUM(view_count) as total_view_count
FROM events;

-- 2. event_views_log의 마이그레이션된 로그 수
SELECT COUNT(*) as migrated_logs
FROM event_views_log
WHERE user_agent = 'Historical Data Migration';

-- 두 값이 일치해야 합니다!
```

## 완료 후

마이그레이션 완료 후:
1. ✅ 어제 날짜의 조회 로그가 생성됨
2. ✅ 기간별 인기 행사 조회 가능
3. ✅ 일별 통계 조회 가능
4. ⬜ 프론트엔드 코드 수정 필요
5. ⬜ 관리자 페이지에 통계 대시보드 추가 (선택)
