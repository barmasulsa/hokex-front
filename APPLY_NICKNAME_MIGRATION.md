# 🐼 닉네임 기능 DB 마이그레이션 실행 가이드

## 1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig

## 2. SQL Editor로 이동
왼쪽 메뉴에서 "SQL Editor" 클릭

## 3. 아래 SQL 실행

```sql
-- Add nickname column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Add unique constraint to nickname (중복 방지)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_nickname'
    ) THEN
        ALTER TABLE user_profiles
        ADD CONSTRAINT unique_nickname UNIQUE (nickname);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_profiles.nickname IS '사용자 닉네임 (자동으로 "판다"가 붙음, 중복 불가)';
```

## 4. 실행 확인

```sql
-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'nickname';

-- Constraint 확인
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'unique_nickname';
```

예상 결과:
- `nickname` 컬럼이 `TEXT` 타입으로 추가됨
- `unique_nickname` constraint가 존재함

## 5. 테스트

### 5.1 로컬 테스트
```bash
cd hokex-front
npm run dev
```

1. 로그인
2. 프로필 페이지 접속
3. 파란색 안내 박스 확인
4. "닉네임 설정하기" 클릭
5. "테스트" 입력 → "테스트판다" 미리보기 확인
6. 저장
7. 성공 메시지 확인

### 5.2 중복 테스트
1. 다른 계정으로 로그인
2. 동일한 닉네임 입력 (예: "테스트")
3. 저장 시도
4. 에러 메시지 확인: "테스트판다는 이미 사용 중인 닉네임입니다"

### 5.3 띄어쓰기 테스트
- "레서" 입력 → "레서판다" (붙여쓰기)
- "레서 " 입력 → "레서 판다" (띄어쓰기)

## 6. Vercel 배포

```bash
git add .
git commit -m "feat: 판다 닉네임 기능 추가 (중복 방지)"
git push
```

Vercel이 자동으로 배포합니다.

## 7. 프로덕션 확인
https://hokex.vercel.app

1. 실제 계정으로 로그인
2. 닉네임 설정 테스트
3. 중복 방지 동작 확인

## 완료! 🎉

이제 모든 사용자가 자신만의 판다 닉네임을 가질 수 있습니다!
