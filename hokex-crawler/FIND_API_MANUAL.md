# COEX 다운로드 API 찾기 (수동)

## 방법 1: 브라우저 개발자 도구 사용

1. **Chrome/Edge 브라우저로 COEX 페이지 열기**
   ```
   https://www.coex.co.kr/event/full-schedules/
   ```

2. **개발자 도구 열기** (F12 또는 Ctrl+Shift+I)

3. **Network 탭 선택**
   - "Preserve log" 체크박스 활성화
   - 필터를 "XHR" 또는 "Fetch"로 설정

4. **"일정 다운로드" 버튼 클릭**

5. **Network 탭에서 새로운 요청 찾기**
   - Excel 파일 다운로드 요청을 찾습니다
   - URL에 "download", "excel", "schedule" 등이 포함될 가능성이 높습니다

6. **요청 정보 확인**
   - URL
   - Method (GET/POST)
   - Headers
   - Query Parameters 또는 POST Body

## 방법 2: 페이지 소스 코드 확인

1. **페이지에서 우클릭 → "페이지 소스 보기"**

2. **"일정 다운로드" 버튼 찾기** (Ctrl+F로 검색)
   - "다운로드" 검색
   - `<a>` 또는 `<button>` 태그 찾기

3. **버튼의 onclick 또는 href 속성 확인**
   ```html
   예시:
   <a href="/api/download/schedule" onclick="downloadSchedule()">일정 다운로드</a>
   ```

4. **JavaScript 함수 찾기**
   - onclick에 함수가 있다면, 그 함수 정의를 찾습니다
   - 보통 `<script>` 태그 안에 있습니다

## 방법 3: 직접 확인해보기

제가 일반적인 패턴을 기반으로 추측해볼 수 있습니다:

```typescript
// 가능한 API 패턴들:
const possibleUrls = [
  'https://www.coex.co.kr/api/schedule/download',
  'https://www.coex.co.kr/event/download/schedule',
  'https://www.coex.co.kr/download/excel',
  'https://www.coex.co.kr/api/events/export',
];
```

## 다음 단계

API URL을 찾으면:
1. `hokex-crawler/api-url.txt` 파일에 저장
2. 저에게 알려주시면 바로 코드 작성하겠습니다!

형식:
```
URL: [찾은 URL]
Method: GET 또는 POST
Headers: [필요한 헤더가 있다면]
Parameters: [쿼리 파라미터나 POST 데이터]
```
