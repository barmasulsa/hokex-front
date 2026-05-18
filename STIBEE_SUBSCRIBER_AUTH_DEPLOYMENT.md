# Stibee 구독자 + 관리자 인증 시스템 배포 가이드

## 개요
- **Stibee 구독자**: 이메일 + 비밀번호로 로그인하여 홈페이지 이용
- **관리자**: `lcw5525@naver.com`만 관리자 권한 부여 (배너 관리 페이지 접근)
- **Edge Function**: `check-stibee-subscriber`에서 Stibee API로 구독자 확인
- **배포 위치**: Supabase Dashboard

---

## 시스템 구조

### 1. 로그인 흐름
1. 사용자가 이메일 + 비밀번호 입력
2. Edge Function이 Stibee API로 구독자 목록 조회
3. 입력된 이메일이 Stibee 구독자 목록에 있으면 로그인 허용
4. `lcw5525@naver.com`인 경우 `isAdmin: true` 반환
5. 다른 Stibee 구독자는 `isAdmin: false` 반환

### 2. 권한 구분
- **일반 Stibee 구독자**: 홈페이지 이용 가능 (행사 조회)
- **관리자 (lcw5525@naver.com)**: 홈페이지 + 배너 관리 페이지 접근 가능

---

## 배포 단계

### 1. 환경 변수 설정 (Supabase Dashboard)

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - 프로젝트 선택

2. **Settings > Edge Functions > Environment Variables**
   - `STIBEE_API_KEY`: Stibee API 키
   - `STIBEE_LIST_ID`: Stibee 리스트 ID

### 2. Edge Function 배포

**파일**: `hokex-front/supabase/functions/check-stibee-subscriber/index.ts`

**주요 로직**:
```typescript
// Stibee API로 구독자 목록 조회
const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers`
const stibeeResponse = await fetch(stibeeUrl, {
  method: 'GET',
  headers: {
    'AccessToken': STIBEE_API_KEY,
    'Content-Type': 'application/json',
  },
})

// 구독자 목록에서 이메일 검색
const subscribers = stibeeData.Ok || []
const isSubscriber = subscribers.some((subscriber: any) => {
  const subscriberEmail = subscriber.email?.toLowerCase().trim()
  return subscriberEmail === normalizedEmail
})

// 관리자 여부 체크
const isAdmin = normalizedEmail === 'lcw5525@naver.com'

return {
  isSubscriber: true,
  isAdmin: isAdmin,
  status: isAdmin ? 'ADMIN' : 'SUBSCRIBER'
}
```

**배포 방법**:

#### Option 1: Supabase Dashboard
1. Edge Functions 메뉴로 이동
2. `check-stibee-subscriber` 함수 선택
3. "Edit Function" 버튼 클릭
4. 코드 복사하여 붙여넣기
5. "Deploy" 버튼 클릭

#### Option 2: Supabase CLI
```bash
cd hokex-front
supabase functions deploy check-stibee-subscriber
```

---

## 테스트

### 1. 관리자 이메일 테스트
```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/check-stibee-subscriber \
  -H "Content-Type: application/json" \
  -d '{"email": "lcw5525@naver.com"}'
```

**예상 응답**:
```json
{
  "isSubscriber": true,
  "isAdmin": true,
  "email": "lcw5525@naver.com",
  "status": "ADMIN",
  "message": "Admin access granted"
}
```

### 2. 일반 Stibee 구독자 테스트
```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/check-stibee-subscriber \
  -H "Content-Type: application/json" \
  -d '{"email": "subscriber@example.com"}'
```

**예상 응답** (구독자인 경우):
```json
{
  "isSubscriber": true,
  "isAdmin": false,
  "email": "subscriber@example.com",
  "status": "SUBSCRIBER",
  "message": "Subscriber access granted"
}
```

**예상 응답** (구독자가 아닌 경우):
```json
{
  "isSubscriber": false,
  "email": "subscriber@example.com",
  "message": "Not a subscriber"
}
```

---

## 프론트엔드 동작

### HomePage.tsx
- **로그인 체크**: Stibee 구독자만 접근 가능
- **리다이렉트**: 로그인하지 않은 경우 `/login`으로 리다이렉트

```typescript
useEffect(() => {
  if (!authLoading && !user) {
    navigate('/login');
  }
}, [user, authLoading, navigate]);
```

### BannerManagementPage.tsx
- **관리자 전용**: `isAdmin`이 `true`인 경우에만 접근 가능
- **리다이렉트**: 관리자가 아니면 홈페이지로 리다이렉트

```typescript
useEffect(() => {
  if (!authLoading && !isAdmin) {
    alert('관리자만 접근할 수 있습니다.');
    navigate('/');
  }
}, [isAdmin, authLoading, navigate]);
```

### AuthContext.tsx
- **구독자 확인**: `checkSubscription()` 함수로 Edge Function 호출
- **로그인 제한**: 구독자가 아니면 `SUBSCRIBER_ONLY` 에러 발생

```typescript
const signInWithPassword = async (email: string, password: string) => {
  // 1. 먼저 스티비 구독자인지 확인
  const isSubscriber = await checkSubscription(email);
  
  if (!isSubscriber) {
    throw new Error('SUBSCRIBER_ONLY');
  }

  // 2. 구독자라면 비밀번호 로그인 진행
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
};
```

---

## 주의사항

1. **환경 변수 필수**
   - `STIBEE_API_KEY`와 `STIBEE_LIST_ID`가 설정되어 있어야 함
   - Supabase Dashboard > Settings > Edge Functions에서 설정

2. **보안**
   - Edge Function은 서버 사이드에서 실행되므로 안전
   - Stibee API 키는 클라이언트에 노출되지 않음

3. **매직 링크 한도 제한**
   - Stibee 매직 링크는 한도 제한이 있어서 이메일+비밀번호 방식 사용
   - 비밀번호는 Supabase Auth에서 관리

4. **관리자 이메일 변경**
   - 관리자 이메일을 변경하려면 Edge Function 코드에서 `ADMIN_EMAIL` 수정 후 재배포

---

## 배포 완료 확인

1. ✅ 환경 변수 설정 완료 (`STIBEE_API_KEY`, `STIBEE_LIST_ID`)
2. ✅ Edge Function 배포 완료
3. ✅ 관리자 이메일 테스트 성공 (`isAdmin: true`)
4. ✅ 일반 구독자 테스트 성공 (`isAdmin: false`)
5. ✅ 비구독자 테스트 성공 (접근 거부)
6. ✅ 프론트엔드에서 로그인 테스트
7. ✅ 홈페이지 접근 테스트 (구독자만)
8. ✅ 관리자 페이지 접근 테스트 (관리자만)

---

## 문제 해결

### Edge Function 배포 실패
```bash
cd hokex-front
supabase functions deploy check-stibee-subscriber
```

### 로그 확인
- Supabase Dashboard > Edge Functions > check-stibee-subscriber > Logs

### Stibee API 에러
- API 키가 올바른지 확인
- 리스트 ID가 올바른지 확인
- Stibee 대시보드에서 API 키 권한 확인

---

## 완료
이제 Stibee 구독자들은 이메일+비밀번호로 로그인하여 홈페이지를 이용할 수 있고, `lcw5525@naver.com`만 관리자 권한을 가지고 배너 관리 페이지에 접근할 수 있습니다.
