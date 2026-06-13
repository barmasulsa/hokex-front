# 방문자 기간별 통계 수정 가이드

## 문제 상황
- 6월 10일에 7명이 방문했는데, 기간별 통계에는 오늘 방문한 1명으로만 표시됨
- 기간별 통계가 실제 데이터와 일치하지 않음

## 원인 분석
Edge Function (`update-visitor-stats-cache`)의 기간 계산 로직에 오류가 있었습니다:

**기존 코드 (잘못됨):**
```typescript
// 최근 7일: 7일 전부터 (총 8일간 계산)
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

// 최근 30일: 30일 전부터 (총 31일간 계산)
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
```

**수정된 코드 (올바름):**
```typescript
// 최근 7일: 오늘 포함 6일 전부터 (정확히 7일)
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

// 최근 30일: 오늘 포함 29일 전부터 (정확히 30일)
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
```

## 수정 단계

### 1. Edge Function 재배포

```bash
cd hokex-front

# Edge Function 재배포
supabase functions deploy update-visitor-stats-cache
```

### 2. 캐시 데이터 즉시 수정

Supabase Dashboard의 SQL Editor에서 `fix-visitor-period-stats.sql` 실행:

```bash
# 또는 CLI로 실행
supabase db query -f fix-visitor-period-stats.sql
```

이 스크립트는:
- 현재 캐시 상태를 확인
- visitor_stats 테이블의 실제 데이터를 기반으로 정확한 기간별 통계를 재계산
- 올바른 값으로 캐시를 업데이트
- 검증을 위해 실제 데이터와 비교

### 3. 결과 확인

스크립트 실행 후 다음과 같은 결과를 확인할 수 있습니다:

```
=== 수정 전 캐시 상태 ===
오늘: 1, 어제: X, 최근7일: X, 최근30일: X

=== 수정 후 캐시 상태 ===
오늘: 1, 어제: X, 최근7일: 7, 최근30일: 7
```

- **오늘**: 오늘 방문자 수 (실시간)
- **어제**: 어제 방문자 수
- **최근 7일**: 오늘 포함 최근 7일간 방문자 수 (6월 7일 ~ 6월 13일)
- **최근 30일**: 오늘 포함 최근 30일간 방문자 수

### 4. 프론트엔드 확인

웹사이트의 관리자 페이지 또는 통계 페이지에서:
1. 기간별 방문자 통계가 올바르게 표시되는지 확인
2. 6월 10일 7명이 최근 7일 통계에 포함되는지 확인

## 자동 업데이트 일정

수정 후 캐시는 다음과 같이 자동 업데이트됩니다:

- **30분마다**: 오늘 방문자 수만 업데이트
- **새벽 4시**: 전체 통계 업데이트 (어제, 최근 7일, 30일, 1년, 총 방문)

## 참고 사항

### 기간 계산 로직
```
오늘: 2026-06-13
어제: 2026-06-12
최근 7일: 2026-06-07 ~ 2026-06-13 (7일)
최근 30일: 2026-05-15 ~ 2026-06-13 (30일)
최근 1년: 2025-06-13 ~ 2026-06-13 (365일)
```

### 데이터 확인 쿼리
```sql
-- 특정 날짜의 방문자 수 확인
SELECT 
  visit_date,
  SUM(visit_count) as total
FROM visitor_stats
WHERE visit_date = '2026-06-10'
GROUP BY visit_date;

-- 최근 7일 방문자 수 확인
SELECT 
  SUM(visit_count) as last_7_days
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '6 days'
  AND visit_date <= CURRENT_DATE;
```

## 완료 체크리스트

- [ ] Edge Function 재배포 완료
- [ ] fix-visitor-period-stats.sql 실행 완료
- [ ] 캐시 업데이트 확인 (최근 7일, 30일이 올바른 값으로 변경됨)
- [ ] 프론트엔드에서 통계 정상 표시 확인
- [ ] 6월 10일 7명이 통계에 반영되었는지 확인

## 문제 발생 시

캐시 수동 업데이트가 필요한 경우:

```sql
-- Edge Function을 수동으로 호출하여 전체 통계 업데이트
SELECT 
  extensions.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-visitor-stats-cache',
    body := '{"type":"full"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
```
