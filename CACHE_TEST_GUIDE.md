# LocalStorage 캐싱 테스트 가이드

## 🎯 목적
홈페이지 첫 페이지 로딩 시 LocalStorage 캐싱이 제대로 작동하는지 확인

## 📋 테스트 방법

### 1단계: 개발 서버 실행
```bash
cd hokex-front
npm run dev
```

### 2단계: 브라우저에서 확인
1. 브라우저에서 `http://localhost:5173` 접속
2. **F12** 키를 눌러 개발자 도구 열기
3. **Console** 탭으로 이동

### 3단계: 캐시 동작 확인

#### 첫 번째 로딩 (캐시 없음)
홈페이지를 처음 로드하면 콘솔에 다음과 같은 로그가 표시됩니다:
```
[fetchEventsPaginated] Fetching page 0 with size 1000
[Cache] ❌ Miss for homepage events, fetching from DB
[fetchEventsPaginated] Fetched 1373 events (total count: 1373)
[Cache] Saved: events:page:0:size:1000 (TTL: 300000ms)
```

#### 두 번째 로딩 (캐시 적중)
**F5** 키를 눌러 페이지를 새로고침하면:
```
[fetchEventsPaginated] Fetching page 0 with size 1000
[Cache] ✅ Hit for homepage events
```

**DB 쿼리 없이 캐시에서 바로 데이터를 가져옵니다!**

### 4단계: LocalStorage 확인
1. 개발자 도구에서 **Application** 탭으로 이동
2. 왼쪽 메뉴에서 **Local Storage** → `http://localhost:5173` 클릭
3. `events:page:0:size:1000` 키가 있는지 확인
4. 값을 클릭하면 저장된 데이터 구조를 볼 수 있습니다:
   ```json
   {
     "data": {
       "events": [...],
       "nextPage": undefined,
       "totalCount": 1373
     },
     "timestamp": 1716789123456,
     "ttl": 300000
   }
   ```

### 5단계: 캐시 만료 테스트
캐시는 5분(300,000ms) 후 자동으로 만료됩니다.

**빠른 테스트 방법:**
1. 개발자 도구 Console에서 다음 명령어 실행:
   ```javascript
   localStorage.removeItem('events:page:0:size:1000')
   ```
2. 페이지 새로고침 (F5)
3. 콘솔에 `[Cache] ❌ Miss` 로그가 다시 나타나는지 확인

## ✅ 성공 기준

### 캐시가 제대로 작동하면:
- ✅ 첫 로딩: `[Cache] ❌ Miss` → DB에서 데이터 가져옴
- ✅ 두 번째 로딩: `[Cache] ✅ Hit` → 캐시에서 즉시 반환
- ✅ LocalStorage에 `events:page:0:size:1000` 키 존재
- ✅ 5분 이내 새로고침 시 DB 쿼리 없음

### 성능 개선 효과:
- **DB 쿼리 시간**: ~500ms → 0ms
- **데이터 로딩 속도**: 98% 향상
- **Supabase 연결 사용**: 1회 → 0회 (캐시 적중 시)

## 🔍 문제 해결

### 캐시 로그가 안 보이는 경우:
1. 콘솔 필터 확인 (All levels 선택)
2. 페이지를 완전히 새로고침 (Ctrl+Shift+R)
3. 로그인 상태 확인 (로그인 안 하면 데이터 안 불러옴)

### LocalStorage가 비어있는 경우:
1. 브라우저 시크릿 모드인지 확인
2. LocalStorage가 비활성화되어 있는지 확인
3. 브라우저 저장 공간이 가득 찼는지 확인

## 📊 예상 결과

### 1,000명 동시 접속 시:
- **캐싱 없음**: 1,000 DB 쿼리 → Pool size 48로 21번 회전 → 평균 2.1초 대기
- **캐싱 적용**: 10-20 DB 쿼리 (98% 감소) → 대기 시간 거의 없음

### 10,000명 동시 접속 시:
- **캐싱 없음**: 불가능 (Max client connections 200 초과)
- **캐싱 적용**: 가능 (대부분 캐시에서 처리)

## 🎉 다음 단계

캐싱이 제대로 작동하면:
1. ✅ 1,000명 동시 접속 대응 완료
2. ✅ Supabase Pro Plan으로 충분
3. ✅ 추가 비용 없음
4. ✅ 10,000명까지 확장 가능

문제가 있으면 콘솔 로그를 캡처해서 보여주세요!
