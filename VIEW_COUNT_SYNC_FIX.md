# 조회수 불일치 문제 해결 가이드

## 문제 상황

"전체" 기간 조회 시 **12회**로 표시되는 행사가, "1개월" 기간 조회 시 **36회**로 표시되는 문제 발생.

이는 논리적으로 불가능한 상황입니다:
- "전체" = 누적 조회수 (events.view_count)
- "1개월" = 최근 30일 조회수 (event_views_log에서 집계)
- **누적 >= 기간별** 이어야 정상

## 원인 분석

`events.view_count` (누적 카운터)와 `event_views_log` (타임스탬프 로그)가 **동기화되지 않음**.

가능한 원인:
1. `increment_event_view_count` 함수가 `events.view_count` 업데이트에 실패
2. 마이그레이션 후 새로운 조회가 발생했으나 누적 카운터가 증가하지 않음
3. RLS 정책이나 권한 문제로 UPDATE 실패

## 해결 방법

### 1단계: 진단 (diagnose-view-count-mismatch.sql)

```bash
# Supabase SQL Editor에서 실행
```

이 쿼리는 다음을 확인합니다:
- `increment_event_view_count` 함수 정의
- "나주곶" 행사의 누적 vs 로그 조회수
- 불일치 행사 목록
- 전체 통계

### 2단계: 동기화 (sync-cumulative-view-counts.sql)

```bash
# Supabase SQL Editor에서 실행
```

이 스크립트는:
1. 현재 불일치 상태 확인
2. `event_views_log`의 실제 로그 수를 세어 `events.view_count` 업데이트
3. 동기화 결과 확인

### 3단계: 프론트엔드 확인

1. 관리자 페이지 > 조회수 통계 탭
2. "전체" 기간 선택 → "2026 나주곶 워크" 조회수 확인
3. "1개월" 기간 선택 → "2026 나주곶 워크" 조회수 확인
4. **"전체" >= "1개월"** 인지 확인

## 예상 결과

동기화 후:
- "전체" (누적): **36회** (또는 그 이상)
- "1개월" (최근 30일): **36회** (또는 그 이하)

## 근본 원인 해결

동기화는 **일회성 수정**입니다. 근본 원인을 해결하려면:

### 함수 재생성 (이미 완료됨)

`setup-and-migrate-view-logs-secure.sql`에서 생성된 함수:

```sql
CREATE OR REPLACE FUNCTION increment_event_view_count(
  p_event_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  -- events 테이블의 view_count 증가
  UPDATE events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_event_id;
  
  -- 조회 로그 기록
  INSERT INTO event_views_log (event_id, user_id)
  VALUES (p_event_id, p_user_id);
END;
$;
```

이 함수는 **두 테이블을 모두 업데이트**합니다.

### 프론트엔드 코드 (이미 완료됨)

`hokex-front/src/services/eventService.ts`:

```typescript
export async function incrementViewCount(eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.rpc('increment_event_view_count', {
      p_event_id: eventId,
      p_user_id: user?.id || null
    });

    if (error) {
      console.error(`[ViewCount] Error incrementing view count:`, error);
    }
  } catch (err) {
    console.error(`[ViewCount] Exception incrementing view count:`, err);
  }
}
```

## 모니터링

동기화 후에도 문제가 재발하면:

1. 브라우저 콘솔에서 `[ViewCount]` 로그 확인
2. Supabase Dashboard > Logs에서 RPC 호출 에러 확인
3. `diagnose-view-count-mismatch.sql` 재실행하여 불일치 확인

## 참고

- `event_views_log`: 90일 후 자동 삭제 (용량 관리)
- `events.view_count`: 영구 보관 (누적 통계)
- 기간별 통계는 `event_views_log`에서 집계
- 전체 통계는 `events.view_count` 사용
