-- ============================================
-- 계정 생성 방법: Supabase Dashboard UI 사용 (권장)
-- ============================================

/*
SQL로 계정 생성 시 500 에러가 발생하므로, 
Supabase Dashboard를 통해 직접 생성하는 것이 가장 안전합니다.

## 단계별 가이드:

### 1단계: Supabase Dashboard 접속
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

### 2단계: Authentication 메뉴로 이동
   - 왼쪽 메뉴에서 "Authentication" 클릭
   - "Users" 탭 선택

### 3단계: 새 사용자 생성
   - "Add user" 버튼 클릭
   - "Create new user" 선택
   
### 4단계: 정보 입력
   Email: sadpandadayo@gmail.com
   Password: 123456
   ✅ "Auto Confirm User" 체크박스 반드시 선택!
   
### 5단계: 생성 완료
   - "Create user" 버튼 클릭
   - 생성된 사용자의 UUID 확인

## 주의사항:
- "Auto Confirm User"를 체크하지 않으면 이메일 인증이 필요합니다
- 비밀번호는 최소 6자 이상이어야 합니다
- 계정 생성 후 바로 로그인 가능합니다

## 계정 생성 후 확인:
*/

-- 1. Auth 계정 확인
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'sadpandadayo@gmail.com';

-- 2. Stibee 구독자 테이블 확인
SELECT email, subscribed_at, list_id
FROM public.stibee_subscribers
WHERE email = 'sadpandadayo@gmail.com';

-- 3. User Profile 확인 (로그인 후 자동 생성됨)
SELECT id, email, nickname, created_at
FROM public.user_profiles
WHERE email = 'sadpandadayo@gmail.com';

/*
## 만약 이미 계정이 존재한다면:

1. Dashboard에서 해당 사용자 찾기
2. 사용자 행 클릭
3. 오른쪽 상단 "..." 메뉴 클릭
4. "Reset Password" 선택
5. 새 비밀번호: 123456 입력
6. "Update user" 클릭

## 로그인 테스트:
- Email: sadpandadayo@gmail.com
- Password: 123456
- 로그인 성공하면 user_profiles 테이블에 자동으로 레코드 생성됨
*/
