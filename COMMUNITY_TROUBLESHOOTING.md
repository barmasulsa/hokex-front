# 커뮤니티 기능 문제 해결 가이드

## 🔍 문제 상황
커뮤니티 버튼을 클릭했을 때 페이지가 제대로 표시되지 않고, 특히 사이드바의 게시판 카테고리 목록이 나타나지 않습니다.

## 📋 진단 단계

### 1단계: 브라우저 콘솔 확인
1. 브라우저에서 `/community` 페이지 접속
2. F12를 눌러 개발자 도구 열기
3. Console 탭에서 에러 메시지 확인
4. Network 탭에서 API 요청 실패 여부 확인

**주요 에러 메시지:**
- `relation "board_categories" does not exist` → 테이블이 없음
- `new row violates row-level security policy` → RLS 정책 문제
- `Failed to load categories` → API 호출 실패

### 2단계: 데이터베이스 진단
Supabase 대시보드의 SQL Editor에서 `DIAGNOSE_COMMUNITY.sql` 실행

```sql
-- 이 파일의 모든 쿼리를 실행하여 진단 결과 확인
```

**확인 사항:**
- ✅ board_categories 테이블이 존재하는가?
- ✅ board_categories에 5개의 카테고리 데이터가 있는가?
- ✅ RLS 정책이 설정되어 있는가?
- ✅ user_profiles 테이블이 존재하는가?

### 3단계: API 테스트 (선택사항)
`test-community-api.html` 파일을 브라우저에서 열어서 테스트

1. 파일 편집하여 Supabase URL과 Anon Key 입력
2. 브라우저에서 파일 열기
3. "전체 진단 실행" 버튼 클릭

## 🔧 해결 방법

### 케이스 1: 테이블이 전혀 없는 경우
**증상:** `relation "board_categories" does not exist`

**해결:**
```sql
-- Supabase SQL Editor에서 실행
-- 파일: create-community-tables.sql의 전체 내용 실행
```

### 케이스 2: 테이블은 있지만 데이터가 없는 경우
**증상:** 콘솔에 `Failed to load categories` 또는 빈 배열 반환

**해결:**
```sql
-- QUICK_FIX_COMMUNITY.sql의 옵션 2 실행
INSERT INTO board_categories (id, name, description, icon, "order") VALUES
  ('all', '전체', '모든 게시판', '📌', 0),
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1),
  ('promotion', '홍보게시판', '행사 및 제품 홍보', '📢', 2),
  ('job', '채용게시판', '정규직/계약직 채용', '💼', 3),
  ('staff', '스태프/단기알바', '행사 스태프 및 단기 알바', '👥', 4)
ON CONFLICT (id) DO NOTHING;
```

### 케이스 3: RLS 정책 문제
**증상:** `new row violates row-level security policy`

**해결:**
```sql
-- QUICK_FIX_COMMUNITY.sql의 옵션 3 실행
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "board_categories_select_all" ON board_categories;
CREATE POLICY "board_categories_select_all" 
ON board_categories 
FOR SELECT 
USING (true);
```

### 케이스 4: user_profiles 테이블 없음
**증상:** posts 조회시 조인 에러

**해결:**
```sql
-- QUICK_FIX_COMMUNITY.sql의 옵션 4 실행
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_stibee_subscriber BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_select_all" 
ON user_profiles 
FOR SELECT 
USING (true);
```

## 🚀 빠른 해결 (전체 재설정)

모든 것을 처음부터 다시 설정하려면:

```sql
-- 1. QUICK_FIX_COMMUNITY.sql 파일의 전체 내용 실행
-- 2. 실행 후 검증 쿼리로 확인
SELECT * FROM board_categories ORDER BY "order";
```

## ✅ 해결 확인

### 브라우저에서 확인
1. `/community` 페이지 새로고침 (Ctrl + Shift + R로 캐시 무시)
2. 왼쪽 사이드바에 5개 카테고리가 표시되는지 확인:
   - 📌 전체
   - 💬 자유게시판
   - 📢 홍보게시판
   - 💼 채용게시판
   - 👥 스태프/단기알바

### 콘솔에서 확인
F12 → Console 탭에서:
- `Failed to load categories` 에러가 없어야 함
- Network 탭에서 `board_categories` 요청이 200 OK 상태

## 📝 추가 문제 해결

### 여전히 안 된다면:

1. **캐시 문제:**
   - Ctrl + Shift + R로 강력 새로고침
   - 시크릿 모드에서 테스트

2. **환경변수 확인:**
   ```typescript
   // src/lib/supabase.ts 파일 확인
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   ```

3. **개발 서버 재시작:**
   ```bash
   # 터미널에서
   Ctrl + C  # 서버 중지
   npm run dev  # 다시 시작
   ```

4. **Supabase 프로젝트 상태 확인:**
   - Supabase 대시보드에서 프로젝트가 활성 상태인지 확인
   - Database 탭에서 테이블이 보이는지 확인

## 🆘 도움 요청시 제공할 정보

문제가 계속되면 다음 정보를 제공해주세요:

1. **브라우저 콘솔 에러 메시지** (전체 내용)
2. **DIAGNOSE_COMMUNITY.sql 실행 결과**
3. **Network 탭의 board_categories 요청 상세 정보**
4. **Supabase 프로젝트 설정** (URL은 가리고)

---

**작성일:** 2026-06-21  
**버전:** 1.0
