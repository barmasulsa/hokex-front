# 배포 확인 가이드

## 현재 상황
- 데이터베이스: ✅ 엑스코 347개, 6월 이후 21개 정상
- 프론트엔드 코드: ✅ 필터 로직 정상
- Git push: ✅ 완료 (2026-05-08)

## 문제
웹사이트에서 5월까지만 표시됨

## 해결 방법

### 1. Vercel 배포 상태 확인
https://vercel.com/barmasulsa/hokex-front/deployments

최신 배포가 "Ready" 상태인지 확인

### 2. 브라우저 캐시 완전 삭제

#### Chrome/Edge
1. `F12` (개발자 도구 열기)
2. Network 탭 선택
3. "Disable cache" 체크
4. `Ctrl + Shift + R` (강제 새로고침)

또는

1. `Ctrl + Shift + Delete`
2. "캐시된 이미지 및 파일" 선택
3. "전체 기간" 선택
4. "데이터 삭제"

#### Firefox
1. `Ctrl + Shift + Delete`
2. "캐시" 선택
3. "전체" 선택
4. "지금 삭제"

### 3. 시크릿 모드로 테스트
`Ctrl + Shift + N` (Chrome) 또는 `Ctrl + Shift + P` (Firefox)

새 시크릿 창에서 https://hokex-front.vercel.app 접속

### 4. 데이터 확인 방법

웹사이트 접속 후:
1. 엑스코 필터 선택
2. 기간 필터에서 "전체" 선택
3. 스크롤해서 6월 이후 행사 확인

**예상 결과:**
- 2026 경북농식품대전 (6월 4일)
- 2026 제17회 대구꽃박람회 (6월 4일)
- 제13회 대구국제뷰티엑스포 (6월 11일)
- ... (총 21개)

### 5. 여전히 안 보인다면

#### A. 로컬에서 직접 확인
```bash
cd hokex-front
npm run dev
```

http://localhost:5173 접속해서 확인

#### B. Vercel 환경 변수 확인
https://vercel.com/barmasulsa/hokex-front/settings/environment-variables

다음 변수가 올바른지 확인:
```
VITE_SUPABASE_URL=https://qmhxnxnaawtjelqlgyig.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwOTgyNDUsImV4cCI6MjA5MjY3NDI0NX0.OIv8lNoOGzunHcFFCIYu7zvBKri5JYY7uQB8ysHI3Mk
```

변경 후 재배포 필요

#### C. 강제 재배포
```bash
cd hokex-front
git commit --allow-empty -m "chore: 강제 재배포"
git push
```

## 디버깅

브라우저 콘솔(F12)에서 다음 명령어 실행:

```javascript
// 현재 로드된 행사 수 확인
console.log('Total events:', document.querySelectorAll('.event-card').length);

// API 요청 확인
fetch('https://qmhxnxnaawtjelqlgyig.supabase.co/rest/v1/events?venue=eq.엑스코&select=*', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwOTgyNDUsImV4cCI6MjA5MjY3NDI0NX0.OIv8lNoOGzunHcFFCIYu7zvBKri5JYY7uQB8ysHI3Mk'
  }
}).then(r => r.json()).then(data => {
  console.log('Total EXCO events:', data.length);
  const afterMay = data.filter(e => e.start_date >= '2026-06-01');
  console.log('After May:', afterMay.length);
  console.log('Sample:', afterMay.slice(0, 3).map(e => e.title));
});
```

## 연락처
문제가 계속되면 스크린샷과 함께 문의
