# Stibee Edge Function 배포 확인 가이드

## 현재 상황
- Edge Function 코드에 개발 우회(development bypass) 추가됨
- `lcw5525@naver.com`은 Stibee API 확인 없이 바로 로그인 허용
- 하지만 Supabase Dashboard에 배포가 안 된 것으로 보임

## 배포 방법

### 1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택

### 2. Edge Function 배포
1. 왼쪽 메뉴에서 **Edge Functions** 클릭
2. `check-stibee-subscriber` 함수 클릭
3. 코드 에디터에서 코드가 올바른지 확인:
   ```typescript
   // 이 부분이 있어야 함:
   const ALLOWED_EMAILS = ['lcw5525@naver.com']
   if (ALLOWED_EMAILS.includes(email.toLowerCase())) {
     console.log(`Development bypass: ${email} is in allowed list`)
     return new Response(...)
   }
   ```
4. **Deploy** 버튼 클릭 (오른쪽 상단)
5. 배포 완료 대기 (보통 10-30초)

### 3. 배포 확인
배포 후 다음 메시지가 표시되어야 함:
- ✅ "Function deployed successfully"
- ✅ 버전 번호 증가 (예: v1 → v2)

### 4. 테스트
1. 브라우저에서 https://hokex.vercel.app 접속
2. 로그인 페이지로 이동
3. `lcw5525@naver.com` 입력
4. 이메일 확인 후 로그인

## 예상 결과

### 성공 시 콘솔 로그:
```
Checking subscription for: lcw5525@naver.com
Development bypass: lcw5525@naver.com is in allowed list
Is subscriber: true Status: DEVELOPMENT_BYPASS
```

### 실패 시 (배포 안 됨):
```
Checking subscription for: lcw5525@naver.com
Stibee API response status: 404
Raw Stibee data: undefined
Is subscriber: false Status: undefined
```

## 문제 해결

### 배포했는데도 안 되는 경우:
1. **브라우저 캐시 삭제**
   - Chrome: Ctrl+Shift+Delete → 캐시 삭제
   - 또는 시크릿 모드로 테스트

2. **Edge Function 로그 확인**
   - Supabase Dashboard → Edge Functions → check-stibee-subscriber
   - Logs 탭 클릭
   - "Development bypass" 메시지가 보이는지 확인

3. **환경 변수 확인**
   - Supabase Dashboard → Project Settings → Edge Functions
   - Secrets 탭에서 확인:
     - `STIBEE_API_KEY`: 설정되어 있어야 함
     - `STIBEE_LIST_ID`: 289942

## 다음 단계

개발 우회로 로그인이 성공하면:
1. Stibee API 문서 확인 필요
2. 올바른 API 엔드포인트 찾기
3. 개발 우회 코드 제거하고 실제 API 연동

## 참고
- 현재 사용 중인 API: `GET https://api.stibee.com/v1/lists/{LIST_ID}/subscribers/{EMAIL}`
- 이 엔드포인트가 404를 반환하므로 Stibee API 문서에서 올바른 엔드포인트 확인 필요
- Stibee API 문서: https://developers.stibee.com/
