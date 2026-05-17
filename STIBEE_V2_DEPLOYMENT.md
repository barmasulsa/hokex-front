# Stibee API v2 Edge Function 배포 가이드

## ✅ 변경 완료 사항

### 1. Stibee API v1 → v2 마이그레이션
- **이전**: `GET /v1/lists/{LIST_ID}/subscribers/{EMAIL}` (404 에러)
- **현재**: `GET /v2/lists/{LIST_ID}/subscribers` (정상 작동)

### 2. 주요 변경사항
- ✅ 개발 우회 코드 제거 (실제 Stibee API 사용)
- ✅ 전체 구독자 목록 조회 후 이메일 필터링
- ✅ Content-Type 헤더 제거 (v2는 AccessToken만 필요)
- ✅ 다양한 구독 상태 지원: `SUBSCRIBED`, `active`, `구독 중` 등

## 🚀 배포 방법

### 방법 1: Supabase CLI 사용 (권장)

```bash
# 1. hokex-front 디렉토리로 이동
cd hokex-front

# 2. Supabase CLI 로그인 (처음 한 번만)
supabase login

# 3. 프로젝트 연결 (처음 한 번만)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Edge Function 배포
supabase functions deploy check-stibee-subscriber

# 5. 환경 변수 확인 (이미 설정되어 있어야 함)
supabase secrets list
```

### 방법 2: Supabase Dashboard 사용

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Edge Functions 섹션 이동**
   - 왼쪽 메뉴에서 "Edge Functions" 클릭

3. **check-stibee-subscriber 함수 선택**
   - 기존 함수가 있으면 선택
   - 없으면 "New Function" 클릭

4. **코드 업데이트**
   - `hokex-front/supabase/functions/check-stibee-subscriber/index.ts` 파일 내용 복사
   - Dashboard의 코드 에디터에 붙여넣기

5. **Deploy 클릭**
   - "Deploy" 버튼 클릭하여 배포

6. **환경 변수 확인**
   - Settings → Edge Functions → Secrets
   - `STIBEE_API_KEY`: `52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921`
   - `STIBEE_LIST_ID`: `289942`

## 🧪 테스트 방법

### 1. 로컬 테스트 (브라우저 콘솔)

```javascript
// 브라우저 개발자 도구 콘솔에서 실행
const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-stibee-subscriber', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ email: 'lcw5525@naver.com' })
});

const data = await response.json();
console.log(data);
// 예상 결과: { isSubscriber: true, email: "lcw5525@naver.com", status: "구독 중", ... }
```

### 2. 실제 로그인 테스트

1. **HOKEX 웹사이트 접속**
   - https://hokex-front.vercel.app/login

2. **이메일 로그인 시도**
   - "이메일로 로그인" 버튼 클릭
   - `lcw5525@naver.com` 입력

3. **예상 결과**
   - ✅ 구독자인 경우: "이메일로 로그인 링크를 전송했습니다" 메시지
   - ❌ 비구독자인 경우: "뉴스레터 구독자만 이용할 수 있습니다" 메시지

### 3. Edge Function 로그 확인

**Supabase Dashboard에서:**
1. Edge Functions → check-stibee-subscriber 선택
2. "Logs" 탭 클릭
3. 로그인 시도 시 다음 로그 확인:
   ```
   Checking subscription for email: lcw5525@naver.com
   Using List ID: 289942
   Stibee API v2 response status: 200
   Total subscribers in list: X
   Subscriber found - Email: lcw5525@naver.com, Status: 구독 중, Is subscribed: true
   ```

## 🔍 문제 해결

### 문제 1: "404 Not Found" 에러
**원인**: Edge Function이 배포되지 않음
**해결**: 위의 배포 방법 다시 실행

### 문제 2: "Server configuration error"
**원인**: 환경 변수 미설정
**해결**: 
```bash
supabase secrets set STIBEE_API_KEY=52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
supabase secrets set STIBEE_LIST_ID=289942
```

### 문제 3: "Failed to verify subscription"
**원인**: Stibee API 키가 유효하지 않거나 List ID가 잘못됨
**해결**: 
1. Stibee 대시보드에서 API 키 확인
2. List ID 확인 (289942)
3. API 키가 2025년 1월 21일 이후 생성되었는지 확인

### 문제 4: 구독자인데 "Not a subscriber" 반환
**원인**: 
- 이메일 주소가 정확히 일치하지 않음 (공백, 대소문자)
- Stibee에서 구독 상태가 "구독 중"이 아님

**해결**:
1. Stibee 대시보드에서 구독자 상태 확인
2. Edge Function 로그에서 실제 응답 데이터 확인
3. 이메일 주소 정확히 입력 (공백 없이)

## 📊 성능 고려사항

### 현재 구현
- 매 로그인 시 Stibee API 호출
- 전체 구독자 목록 조회 후 필터링
- **적합한 경우**: 구독자 수 < 1,000명

### 향후 최적화 (구독자 수 증가 시)

#### 옵션 1: 캐싱 (간단)
```typescript
// Edge Function에 캐싱 추가
let cachedSubscribers = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

if (Date.now() - cacheTime < CACHE_DURATION && cachedSubscribers) {
  subscribers = cachedSubscribers;
} else {
  const response = await fetch(...);
  cachedSubscribers = await response.json();
  cacheTime = Date.now();
  subscribers = cachedSubscribers;
}
```

#### 옵션 2: DB 동기화 (권장)
1. Supabase에 `stibee_subscribers` 테이블 생성
2. 주기적으로 (1시간마다) Stibee API에서 구독자 목록 가져와 DB 업데이트
3. Edge Function에서 DB 조회 (빠름)

#### 옵션 3: Webhook (실시간)
1. Stibee Webhook 설정
2. 구독/구독취소 시 Supabase DB 자동 업데이트
3. Edge Function에서 DB 조회

## ✅ 배포 체크리스트

- [ ] Edge Function 코드 업데이트 완료
- [ ] Supabase에 Edge Function 배포 완료
- [ ] 환경 변수 설정 확인 (STIBEE_API_KEY, STIBEE_LIST_ID)
- [ ] 테스트 이메일로 로그인 테스트 성공
- [ ] Edge Function 로그에서 정상 작동 확인
- [ ] 비구독자 이메일로 차단 테스트 성공
- [ ] 프론트엔드 Vercel 배포 완료

## 📝 참고 자료

- [Stibee API 문서](https://developers.stibee.com/)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [STIBEE_API_INVESTIGATION.md](./STIBEE_API_INVESTIGATION.md) - 상세 조사 내용
