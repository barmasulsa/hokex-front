# 캐시 삭제 및 재시작 가이드

## 문제
- DB에 2875개 이벤트가 있지만 1000개만 로드됨
- 배치 로딩 로그가 콘솔에 나타나지 않음

## 원인
1. LocalStorage에 1000개 캐시가 저장되어 있음
2. 개발 서버가 코드 변경을 반영하지 못함

## 해결 방법

### 1단계: LocalStorage 캐시 완전 삭제
브라우저 개발자 도구(F12)에서:
```javascript
// 콘솔에서 실행
localStorage.clear();
console.log('✅ LocalStorage cleared');
```

### 2단계: 개발 서버 재시작
터미널에서 Ctrl+C로 서버 중지 후:
```bash
cd hokex-front
npm run dev
```

### 3단계: 브라우저 강력 새로고침
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

### 4단계: 콘솔 로그 확인
다음 로그가 나타나야 합니다:
```
[fetchEventsPaginated] Large pageSize detected, fetching all data in batches
[fetchEventsPaginated] Fetching batch: 0 to 999
[fetchEventsPaginated] Batch fetched 1000 events (total so far: 1000)
[fetchEventsPaginated] Fetching batch: 1000 to 1999
[fetchEventsPaginated] Batch fetched 1000 events (total so far: 2000)
[fetchEventsPaginated] Fetching batch: 2000 to 2999
[fetchEventsPaginated] Batch fetched 875 events (total so far: 2875)
[fetchEventsPaginated] ✅ All batches complete. Total events loaded: 2875
[HomePage] Total events loaded: 2875
[HomePage] Total count from DB: 2875
```

## 확인 사항
- [ ] LocalStorage 삭제 완료
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 강력 새로고침 완료
- [ ] 콘솔에 배치 로딩 로그 확인
- [ ] "Total events loaded: 2875" 확인
