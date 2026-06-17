# 로컬 개발 환경 테스트 가이드

## 현재 상황
- 프로덕션에 실수로 푸시한 변경사항을 revert 완료
- 로그인 시 "Invalid login credentials" 에러 발생
- 테스트 계정: `lcw7914875@gmail.com` / 비밀번호: `123456`

## 1단계: 비밀번호 해시 진단

Supabase SQL Editor에서 `CHECK-PASSWORD-HASH.sql` 실행:

```sql
-- 파일: CHECK-PASSWORD-HASH.sql
-- 이 파일을 Supabase SQL Editor에서 실행하세요
```

### 예상 결과 확인:
1. **Auth 계정 존재 확인**: `lcw7914875@gmail.com` 계정이 있어야 함
2. **비밀번호 해시 존재**: `encrypted_password` 필드가 `$2a$` 또는 `$2b$`로 시작해야 함
3. **비밀번호 검증**: `password_matches` 컬럼이 `true`여야 함

### 문제 시나리오:
- **password_matches = false**: 해시가 잘못됨 → 2단계로
- **계정 없음**: 계정 생성 실패 → `DELETE-TRIGGER-AND-ADD-ACCOUNT.sql` 재실행

---

## 2단계: 비밀번호 해시 재생성 (필요시)

만약 비밀번호가 매치되지 않으면, 올바른 해시로 재생성:

```sql
-- 올바른 bcrypt 해시로 비밀번호 업데이트
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'lcw7914875@gmail.com';

-- 확인
SELECT 
    email,
    crypt('123456', encrypted_password) = encrypted_password AS password_matches
FROM auth.users
WHERE email = 'lcw7914875@gmail.com';
```

---

## 3단계: 로컬 개발 서버에서 AuthContext 수정

### 3-1. 로컬 개발 서버 시작

```bash
cd hokex-front
npm run dev
```

### 3-2. AuthContext.tsx 수정

파일: `src/contexts/AuthContext.tsx`

**수정 전 (line 243-249):**
```typescript
// Edge Function으로 Stibee 구독자 확인
const { data: subData, error: subError } = await supabase.functions.invoke(
  'check-stibee-subscriber',
  { body: { email } }
);
```

**수정 후:**
```typescript
// DB RPC로 Stibee 구독자 확인 (로컬 테스트용)
const { data: subData, error: subError } = await supabase.rpc(
  'check_subscriber_in_db',
  { user_email: email }
);
```

### 3-3. 전체 변경사항 정리

```typescript
// 변경 위치: line 243-249
const signInWithPassword = async (email: string, password: string) => {
  try {
    // ✅ Edge Function 대신 DB RPC 사용
    const { data: subData, error: subError } = await supabase.rpc(
      'check_subscriber_in_db',
      { user_email: email }
    );

    if (subError) {
      console.error('구독자 확인 오류:', subError);
      throw new Error('SUBSCRIBER_CHECK_FAILED');
    }

    // ✅ 응답 구조 변경: subData는 boolean 값 직접 반환
    if (!subData) {
      throw new Error('SUBSCRIBER_ONLY');
    }

    // 이후 로직은 동일...
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // ...
  }
};
```

---

## 4단계: RPC 함수 생성 확인

`DIAGNOSE-AND-FIX-CHECKSUBSCRIPTION.sql`이 이미 실행되었는지 확인:

```sql
-- RPC 함수 존재 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'check_subscriber_in_db'
  AND routine_schema = 'public';
```

**함수가 없으면** `DIAGNOSE-AND-FIX-CHECKSUBSCRIPTION.sql` 실행.

---

## 5단계: 로컬에서 로그인 테스트

1. 브라우저에서 `http://localhost:5173` (또는 개발 서버 포트) 접속
2. 로그인 시도: `lcw7914875@gmail.com` / `123456`
3. 브라우저 개발자 도구 콘솔 확인

### 예상 결과:
- ✅ **성공**: 로그인 완료, 홈페이지로 이동
- ❌ **실패**: 에러 메시지 확인 후 6단계로

---

## 6단계: 에러 디버깅

### 에러 1: "SUBSCRIBER_ONLY"
**원인**: `check_subscriber_in_db` RPC가 false 반환  
**해결**: Stibee subscribers 테이블에 이메일 추가 확인

```sql
SELECT * FROM stibee_subscribers WHERE email = 'lcw7914875@gmail.com';
```

### 에러 2: "Invalid login credentials"
**원인**: 비밀번호 해시 불일치  
**해결**: 2단계로 돌아가서 비밀번호 재생성

### 에러 3: "SUBSCRIBER_CHECK_FAILED"
**원인**: RPC 함수 오류  
**해결**: RPC 함수 재생성 (4단계)

---

## 7단계: 로컬 테스트 성공 후

**로컬에서 로그인이 성공하면:**

1. ✅ 변경사항 커밋 (AuthContext.tsx만)
2. ✅ 테스트 브랜치 생성
3. ✅ Vercel 프리뷰 배포로 검증
4. ✅ 최종 승인 후 프로덕션 배포

```bash
# 테스트 브랜치 생성
git checkout -b fix/login-subscriber-check-local-db

# 변경사항 커밋
git add src/contexts/AuthContext.tsx
git commit -m "fix: Use local DB RPC instead of Edge Function for subscriber check"

# 푸시 (프리뷰 배포 자동 생성됨)
git push origin fix/login-subscriber-check-local-db
```

---

## 주의사항

⚠️ **절대 main 브랜치에 직접 푸시하지 마세요!**
⚠️ **로컬 테스트 → 프리뷰 배포 → 프로덕션 순서 준수**

---

## 현재 파일 상태

- ✅ `CHECK-PASSWORD-HASH.sql` - 비밀번호 진단 준비됨
- ✅ `DIAGNOSE-AND-FIX-CHECKSUBSCRIPTION.sql` - RPC 함수 준비됨
- ⏳ `AuthContext.tsx` - 수정 대기 중 (로컬에서만)
