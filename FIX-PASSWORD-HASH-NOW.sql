-- 올바른 bcrypt 해시로 비밀번호 재설정
-- 비밀번호: 123456

UPDATE auth.users
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'lcw7914875@gmail.com';

-- 확인: password_matches가 true여야 함
SELECT 
    email,
    encrypted_password,
    crypt('123456', encrypted_password) = encrypted_password AS password_matches,
    CASE 
        WHEN crypt('123456', encrypted_password) = encrypted_password THEN '✅ 비밀번호 해시 올바름'
        ELSE '❌ 비밀번호 해시 여전히 잘못됨'
    END AS status
FROM auth.users
WHERE email = 'lcw7914875@gmail.com';
