# 구미코 행사가 로컬에서 안 나오는 문제 해결 가이드

## 문제 상황
- Vercel(배포)에서는 구미코 행사가 잘 나옴
- 로컬 개발 서버에서는 구미코 행사가 안 나옴
- DB에는 구미코 행사 123개가 정상적으로 있음 (region: '경상도')

## 원인 분석
구미코는 `region: '경상도'`로 설정되어 있고, 프론트엔드 타입에도 정상적으로 매핑되어 있습니다.
가능한 원인:
1. **로컬 캐시 문제** (localStorage/sessionStorage)
2. 로컬 환경 변수 (.env.local) 문제
3. 개발 서버 재시작 필요

## 해결 방법

### 1단계: 브라우저 캐시 완전 삭제
```javascript
// 브라우저 개발자 도구 Console에서 실행
localStorage.clear();
sessionStorage.clear();
console.log('캐시 삭제 완료!');
```

### 2단계: 개발 서버 재시작
```bash
# 터미널에서
npm run dev
```

### 3단계: Hard Refresh
- Windows/Linux: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 4단계: 확인
1. 브라우저에서 http://localhost:5173 접속
2. 지역 필터에서 "경상도" 선택
3. 전시장 필터에서 "구미코" 선택
4. 행사 목록 확인

## 추가 디버깅 (문제가 계속되면)

### DB 직접 확인
```bash
cd hokex-crawler
npx tsx check-gumico-in-db.ts
```

### 브라우저 Network 탭 확인
1. F12 → Network 탭
2. 페이지 새로고침
3. `events` 관련 요청 확인
4. Response에 구미코 데이터가 있는지 확인

### Console 로그 확인
```javascript
// 브라우저 Console에서 실행
console.log('현재 필터:', {
  region: sessionStorage.getItem('homeFilterState')
});
```

## 예상 결과
- 구미코 행사 123개가 정상적으로 표시됨
- 경상도 > 구미코 필터링 작동

## 참고
- Region 타입: `경상도` ✓ (정상)
- REGION_VENUE_MAP에 구미코 포함 ✓ (정상)
- DB에 데이터 존재 ✓ (정상)
