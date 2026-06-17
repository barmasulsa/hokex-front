# 로그인 문제 진단 가이드

## 현재 상황
- SQL 마이그레이션 실행 완료
- Stibee 동기화 정상 작동 확인됨
- 하지만 비밀번호 `123456` 로그인 시 `SUBSCRIBER_ONLY` 에러 발생

## 진단 SQL 실행 방법

### 방법 1: 빠른 진단 (권장)
1. `quick-login-diagnosis.sql` 파일 열기
2. **2군데** 이메일 변경:
   - 3번째 줄: `SELECT 'YOUR_EMAIL_HERE@example.com' AS email`
   - 마지막 부근: `WHERE email = (SELECT email FROM (SELECT 'YOUR_EMAIL_HERE@example.com' AS email) AS t)`
3. Supabase SQL Editor에서 실행
4. 결과의 첫 번째 행에 문제 원인 표시됨

### 방법 2: 상세 진단
1. `diagnose-login-detailed.sql` 파일 열기
2. **1군데** 이메일 변경:
   - 15번째 줄: `SELECT 'YOUR_EMAIL_HERE' as email`
3. Supabase SQL Editor에서 실행
4. 단계별 진단 결과 확인

## 예상 원인 및 해결 방법

### 1️⃣ "Stibee 구독자 아님" ❌
**원인**: 이메일이 Stibee에 없음

**해결**:
```sql
-- Stibee 구독자 수동 추가
INSERT INTO public.stibee_subscribers (email, last_synced_at)
VALUES ('your-email@example.com', NOW());
```

---

### 2️⃣ "Auth 계정이 없음" ❌
**원인**: 마이그레이션이 이 이메일에 대해 Auth 계정을 생성하지 못함

**해결**: 
```sql
-- Auth 계정 수동 생성
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'your-email@example.com',  -- 👈 이메일 변경
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- user_profiles 테이블에도 추가
  INSERT INTO public.user_profiles (id, email, is_admin, nickname)
  VALUES (new_user_id, 'your-email@example.com', FALSE, NULL);  -- 👈 이메일 변경

  RAISE NOTICE 'Auth 계정 생성 완료: %', new_user_id;
END;
$$;
```

---

### 3️⃣ "비밀번호가 설정되지 않음" ❌
**원인**: Auth 계정은 있지만 비밀번호가 NULL

**해결**:
```sql
-- 비밀번호 수동 설정
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'your-email@example.com';  -- 👈 이메일 변경
```

---

### 4️⃣ "이메일 미확인" ❌
**원인**: Supabase Auth 설정에서 이메일 확인을 요구함

**해결 A (권장)**: 이메일 확인 강제 설정
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com';  -- 👈 이메일 변경
```

**해결 B**: Supabase Dashboard에서 설정 변경
1. Supabase Dashboard → Authentication → Settings
2. "Enable email confirmations" 비활성화

---

### 5️⃣ "비밀번호가 123456이 아님" ❌
**원인**: 비밀번호가 다른 값으로 설정됨

**해결**:
```sql
-- 비밀번호 123456으로 재설정
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'your-email@example.com';  -- 👈 이메일 변경
```

---

### 6️⃣ "모든 체크 통과 - 로그인 가능해야 함" ✅
**원인**: Edge Function `check-stibee-subscriber`가 false 반환

**해결 A**: Edge Function 로그 확인
```bash
# Supabase CLI로 로그 확인
supabase functions logs check-stibee-subscriber --follow
```

**해결 B**: Stibee 동기화 강제 실행
```sql
-- Stibee 동기화 강제 실행
SELECT cron.schedule(
  'force-sync-now',
  '* * * * *',  -- 1분마다 (테스트용)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-stibee-subscribers',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
```

**해결 C**: 브라우저 캐시 삭제
- Chrome: F12 → Application → Clear storage → Clear site data
- 시크릿 모드에서 재시도

---

## 추가 확인 사항

### Supabase Auth 설정 확인
```sql
-- Auth 설정 확인
SELECT * FROM auth.config 
WHERE name IN ('DISABLE_SIGNUP', 'MAILER_AUTOCONFIRM', 'EXTERNAL_EMAIL_ENABLED');
```

### 최근 생성된 계정 확인
```sql
-- 마지막 5개 Auth 계정 확인
SELECT 
  email,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
  email_confirmed_at IS NOT NULL AS email_confirmed,
  encrypted_password IS NOT NULL AS has_password
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

### Edge Function 테스트
```bash
# Edge Function 직접 호출 테스트
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-stibee-subscriber' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-email@example.com"}'
```

---

## 문제 해결 후 확인

1. 브라우저 시크릿 모드에서 테스트
2. 이메일 + 비밀번호 `123456` 로그인
3. 로그인 성공하면 프로필에서 비밀번호 변경

---

## 여전히 문제가 있다면

진단 SQL 실행 결과를 공유해주세요:
- `quick-login-diagnosis.sql` 전체 결과
- 또는 `diagnose-login-detailed.sql` 전체 결과
- 브라우저 개발자 도구 콘솔 에러 메시지

이 정보로 정확한 원인 파악이 가능합니다.
