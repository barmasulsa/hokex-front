# 관리자 인증 시스템 설계

## 아키텍처

### 1. 데이터베이스 스키마

```sql
-- user_profiles 테이블
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 프로필 읽기 가능
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- events 테이블 RLS 업데이트
-- 읽기: 모두 허용
CREATE POLICY "Anyone can read events"
  ON events FOR SELECT
  USING (true);

-- 쓰기: 관리자만 허용
CREATE POLICY "Only admins can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### 2. 프론트엔드 구조

```
src/
├── contexts/
│   └── AuthContext.tsx          # 인증 상태 관리
├── components/
│   ├── LoginForm.tsx            # 로그인 폼
│   └── ProtectedRoute.tsx       # 보호된 라우트
├── pages/
│   ├── LoginPage.tsx            # 로그인 페이지
│   └── ...
└── lib/
    └── supabase.ts              # Supabase 클라이언트
```

### 3. 인증 흐름

```
1. 사용자가 로그인 페이지 접속
2. 이메일/비밀번호 입력
3. Supabase Auth로 인증
4. 성공 시 user_profiles에서 is_admin 확인
5. AuthContext에 사용자 정보 저장
6. 관리자면 수정 기능 활성화
```

### 4. 컴포넌트 설계

#### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### LoginForm
- 이메일 입력
- 비밀번호 입력
- 로그인 버튼
- 에러 메시지 표시

#### App.tsx 변경
- 관리자 모드 토글 버튼 제거
- 로그인 상태에 따라 UI 변경
- 관리자면 자동으로 수정 모드 활성화

## 보안 고려사항

1. **세션 관리**
   - Supabase Auth의 JWT 토큰 사용
   - 자동 갱신 (1시간마다)
   - localStorage에 세션 저장

2. **RLS 정책**
   - DB 레벨에서 권한 체크
   - 프론트엔드 우회 불가능

3. **환경변수**
   - Supabase URL과 anon key는 공개 가능
   - service_role key는 절대 프론트엔드에 노출 금지

## 배포 고려사항

1. Vercel 환경변수 설정
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Supabase 설정
   - Email Auth 활성화
   - 이메일 확인 비활성화 (관리자만 사용)
