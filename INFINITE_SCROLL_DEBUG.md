# 무한 스크롤 디버깅 가이드

## ✅ 최종 수정 완료 (2026-05-26)

### 수정 내역
1. **무한 루프 해결**: `useEffect`에서 `useMemo`로 변경하여 필터링 로직 최적화
2. **React Query 무한 스크롤**: `useInfiniteQuery`로 48개씩 페이지네이션 구현
3. **Intersection Observer**: 스크롤 시 자동으로 다음 페이지 로드

## 테스트 방법

### 1단계: 브라우저 캐시 완전 정리

브라우저 콘솔(F12)에서 다음 명령어 실행:

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2단계: 콘솔 로그 확인

페이지 새로고침 후 다음 로그들이 나타나는지 확인:

```
[useInfiniteQuery] Fetching page: 0
[fetchEventsPaginated] Fetching page 0 with size 48
[fetchEventsPaginated] Fetched 48 events (total count: XXX)
[HomePage] Total events loaded: 48
[HomePage] Pages loaded: 1
[HomePage] Events with saved flags: 48
[HomePage] Filtering with: {...}
[HomePage] After showCurrentOnly filter: XX
[HomePage] After venue filter: XX
[HomePage] After category filter: XX
[HomePage] After industry filter: XX
[HomePage] Final filtered: XX
[HomePage] After deduplication: XX
```

### 3단계: 무한 스크롤 테스트

1. 페이지를 아래로 스크롤
2. 다음 로그가 나타나는지 확인:
   ```
   [InfiniteScroll] Loading more events...
   [useInfiniteQuery] Fetching page: 1
   [fetchEventsPaginated] Fetching page 1 with size 48
   [fetchEventsPaginated] Fetched 48 events
   [HomePage] Total events loaded: 96
   [HomePage] Pages loaded: 2
   ```

### 4단계: 필터링 테스트

1. 지역, 전시장, 카테고리 등 필터 적용
2. 필터링된 결과가 즉시 표시되는지 확인
3. 스크롤 시 추가 데이터가 로드되는지 확인

## 예상 동작

- ✅ 첫 로드: 48개 행사 표시 (3열 × 16행)
- ✅ 스크롤 시: 추가 48개씩 로드
- ✅ 필터 적용 시: 즉시 필터링된 결과 표시 (무한 루프 없음)
- ✅ 더 이상 로드할 데이터가 없으면 로딩 메시지 사라짐
- ✅ 모든 페이지의 데이터가 메모리에 유지되어 필터링 가능

## 문제 해결

### 행사가 표시되지 않는 경우
1. 브라우저 캐시 정리 (위 1단계)
2. 콘솔에서 에러 메시지 확인
3. Network 탭에서 Supabase API 호출 확인

### 무한 루프가 발생하는 경우
- ✅ 이미 수정됨: `useMemo`로 변경하여 해결

### 스크롤이 작동하지 않는 경우
1. `hasNextPage`가 `true`인지 확인
2. Intersection Observer가 제대로 작동하는지 확인
3. 콘솔에서 `[InfiniteScroll]` 로그 확인

## 기술 세부사항

### useMemo를 사용한 이유
- `useEffect`는 cleanup 함수를 반환해야 하며, 값을 반환할 수 없음
- `useMemo`는 의존성 배열이 변경될 때만 재계산하여 성능 최적화
- 필터링 로직이 무한 루프에 빠지지 않도록 보장

### React Query 무한 스크롤
- `useInfiniteQuery`는 페이지네이션을 자동으로 관리
- `getNextPageParam`으로 다음 페이지 번호 결정
- 모든 페이지의 데이터를 `data.pages`에 저장하여 필터링 가능

### Intersection Observer
- 스크롤이 특정 요소에 도달하면 자동으로 다음 페이지 로드
- `threshold: 0.1`로 10% 보이면 트리거
- `hasNextPage`와 `isFetchingNextPage`로 중복 요청 방지
