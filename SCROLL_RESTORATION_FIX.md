# 스크롤 복원 수정 가이드

## 문제
HomePage.tsx의 329-395번 라인에 손상된 스크롤 복원 코드가 있습니다.

## 해결 방법

### 1단계: 손상된 코드 삭제
`hokex-front/src/pages/HomePage.tsx` 파일을 열고 **329번 라인부터 395번 라인까지** 삭제하세요.

**삭제할 부분 시작 (329번 라인):**
```typescript
  // 스크롤 복원 (sessionStorage 사용)
  useEffect(() => {
```

**삭제할 부분 끝 (395번 라인):**
```typescript
  }, [isLoading, filteredEvents.length, displayCount]);
```

### 2단계: 올바른 코드 삽입
삭제한 위치(329번 라인)에 아래 코드를 **그대로** 복사해서 붙여넣으세요:

```typescript
  // 스크롤 복원 (sessionStorage 사용)
  useEffect(() => {
    if (!isLoading && filteredEvents.length > 0) {
      const savedScroll = sessionStorage.getItem('homeScrollPosition');
      if (savedScroll) {
        const targetY = parseInt(savedScroll, 10);
        console.log('[HomePage] Found saved scroll position:', targetY);
        
        // 카드 평균 높이 추정 (이미지 200px + 컨텐츠 ~150px + 여백)
        const estimatedCardHeight = 380;
        const cardsPerRow = 3; // 고정 3열 그리드
        
        // 목표 위치에 도달하기 위해 필요한 최소 카드 수 계산 (여유있게 +48)
        const requiredRows = Math.ceil(targetY / estimatedCardHeight);
        const requiredCards = Math.min(
          (requiredRows * cardsPerRow) + 48, // 여유분 추가
          filteredEvents.length
        );
        
        console.log('[HomePage] Calculated required cards:', requiredCards, 'for target:', targetY, 'current displayCount:', displayCount);
        
        // displayCount가 부족하면 먼저 증가시킴
        if (displayCount < requiredCards) {
          console.log('[HomePage] Increasing displayCount from', displayCount, 'to', requiredCards);
          setDisplayCount(requiredCards);
          return; // 다음 렌더링에서 복원 시도
        }
        
        let attempts = 0;
        const maxAttempts = 100; // 10초
        
        const tryRestore = () => {
          attempts++;
          const currentHeight = document.documentElement.scrollHeight;
          const viewportHeight = window.innerHeight;
          
          console.log(`[HomePage] Restore attempt ${attempts}: height=${currentHeight}, target=${targetY}, displayCount=${displayCount}`);
          
          // 페이지 높이가 목표 위치보다 충분히 큼
          const hasEnoughHeight = currentHeight >= targetY + viewportHeight * 0.8;
          
          if (hasEnoughHeight || attempts >= maxAttempts) {
            window.scrollTo(0, targetY);
            console.log('[HomePage] Scroll restored to:', targetY, `(ready: ${hasEnoughHeight}, attempts: ${attempts})`);
            sessionStorage.removeItem('homeScrollPosition');
          } else {
            setTimeout(tryRestore, 100);
          }
        };
        
        // 초기 딜레이 후 복원 시작
        setTimeout(tryRestore, 200);
      }
    }
  }, [isLoading, filteredEvents.length, displayCount]);
```

### 3단계: 파일 저장
파일을 저장하고 브라우저를 새로고침하세요.

## 테스트 방법
1. 홈페이지에서 아래로 스크롤 (약 6000px 정도)
2. 행사 카드 클릭
3. 브라우저 뒤로가기 버튼 클릭
4. 스크롤 위치가 정확히 복원되는지 확인

## 작동 원리
1. **카드 수 계산**: 목표 스크롤 위치에 필요한 카드 수를 미리 계산
2. **displayCount 증가**: 부족하면 먼저 displayCount를 증가시켜 카드 렌더링
3. **폴링 복원**: 페이지 높이가 충분해질 때까지 100ms마다 체크
4. **복원 실행**: 조건이 만족되면 스크롤 위치 복원

## 파일 위치
- 수정할 파일: `hokex-front/src/pages/HomePage.tsx`
- 라인 번호: 329-395번 라인 교체
