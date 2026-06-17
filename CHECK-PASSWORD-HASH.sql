-- 1. Auth 계정 확인
SELECT 
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users
WHERE email = 'lcw7914875@gmail.com';

-- 2. Stibee Subscribers 확인
SELECT *
FROM public.stibee_subscribers
WHERE email = 'lcw7914875@gmail.com';

-- 3. User Profiles 확인
SELECT *
FROM public.user_profiles
WHERE email = 'lcw7914875@gmail.com';

-- 4. 비밀번호 해시 테스트 (bcrypt 확장이 있는지 확인)
SELECT crypt('123456', gen_salt('bf')) AS test_hash;

-- 5. 실제 비밀번호 검증 테스트
SELECT 
    email,
    encrypted_password,
    crypt('123456', encrypted_password) = encrypted_password AS password_matches
FROM auth.users
WHERE email = 'lcw7914875@gmail.com';
