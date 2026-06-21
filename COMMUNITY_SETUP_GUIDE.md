# 커뮤니티 기능 설치 가이드

## 📋 개요

HOKEX 플랫폼에 커뮤니티 기능을 추가하기 위한 데이터베이스 설정 가이드입니다.

## ✅ 현재 구현 상태

### 완료된 작업
- ✅ **프론트엔드 구현 완료**
  - `CommunityPage.tsx`: 커뮤니티 메인 페이지 (HomePage 레이아웃 동일)
  - `communityService.ts`: API 서비스 레이어 (공지사항 지원)
  - `App.tsx`: 라우팅 및 네비게이션 설정 완료
  
- ✅ **SQL 마이그레이션 파일 생성 완료**
  - `supabase-migrations/create-community-tables.sql`: 커뮤니티 테이블 생성
  - `supabase-migrations/create-community-rpc-functions.sql`: RPC 함수 생성
  - `supabase-migrations/add-community-notice-field.sql`: 공지사항 필드 추가

### 필요한 작업
- ⏳ **데이터베이스 마이그레이션 실행** ← 이 단계 필요!
- ⏳ 테스트 데이터 생성 (선택사항)

---

## 🚀 데이터베이스 설정 (필수)

### 1단계: 커뮤니티 테이블 생성

Supabase Dashboard → SQL Editor로 이동하여 다음 SQL 파일을 순서대로 실행하세요:

#### 1-1. 기본 테이블 생성
파일: `supabase-migrations/create-community-tables.sql`

이 SQL은 다음을 생성합니다:
- `board_categories` - 게시판 카테고리 (자유게시판, 질문게시판 등)
- `posts` - 게시글
- `comments` - 댓글
- `likes` - 좋아요
- `reports` - 신고
- RLS (Row Level Security) 정책
- 자동 업데이트 트리거

```sql
-- SQL Editor에서 실행
-- (supabase-migrations/create-community-tables.sql 파일 내용 복사 후 실행)
```

**✅ 확인 방법:**
```sql
-- 테이블이 제대로 생성되었는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('board_categories', 'posts', 'comments', 'likes', 'reports');
```

#### 1-2. RPC 함수 생성
파일: `supabase-migrations/create-community-rpc-functions.sql`

조회수 증가 함수를 생성합니다.

```sql
-- SQL Editor에서 실행
-- (supabase-migrations/create-community-rpc-functions.sql 파일 내용 복사 후 실행)
```

**✅ 확인 방법:**
```sql
-- RPC 함수가 생성되었는지 확인
SELECT proname 
FROM pg_proc 
WHERE proname = 'increment_post_view_count';
```

#### 1-3. 공지사항 필드 추가
파일: `supabase-migrations/add-community-notice-field.sql`

커뮤니티 공지사항 기능을 위한 필드를 추가합니다.

```sql
-- SQL Editor에서 실행
-- (supabase-migrations/add-community-notice-field.sql 파일 내용 복사 후 실행)
```

**✅ 확인 방법:**
```sql
-- is_notice, notice_order 컬럼이 추가되었는지 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'posts' 
  AND column_name IN ('is_notice', 'notice_order');
```

---

### 2단계: 초기 게시판 카테고리 생성 (선택사항)

커뮤니티가 작동하려면 최소 1개 이상의 게시판 카테고리가 필요합니다.

```sql
-- 기본 게시판 카테고리 생성
INSERT INTO board_categories (name, description, icon, "order", is_active)
VALUES
  ('자유게시판', '자유롭게 이야기를 나누는 공간입니다', '💬', 1, true),
  ('질문게시판', '궁금한 점을 물어보세요', '❓', 2, true),
  ('정보공유', '유용한 정보를 공유하는 게시판입니다', '📚', 3, true),
  ('건의사항', '서비스 개선 아이디어를 제안해주세요', '💡', 4, true);
```

**✅ 확인 방법:**
```sql
-- 게시판 카테고리가 생성되었는지 확인
SELECT * FROM board_categories ORDER BY "order";
```

---

### 3단계: 테스트 게시글 생성 (선택사항)

개발 환경에서 테스트용 게시글을 생성할 수 있습니다.

```sql
-- 테스트 게시글 생성 (본인의 user_id로 변경 필요)
INSERT INTO posts (
  board_category_id, 
  user_id, 
  title, 
  content,
  is_notice,
  notice_order
)
SELECT 
  (SELECT id FROM board_categories WHERE name = '자유게시판' LIMIT 1),
  auth.uid(), -- 현재 로그인한 사용자 ID
  '커뮤니티 오픈 안내',
  '안녕하세요! HOKEX 커뮤니티가 오픈되었습니다. 자유롭게 의견을 나눠주세요!',
  true, -- 공지사항으로 설정
  100   -- 공지사항 최상단 고정
WHERE auth.uid() IS NOT NULL;

-- 일반 게시글 예시
INSERT INTO posts (
  board_category_id, 
  user_id, 
  title, 
  content
)
SELECT 
  (SELECT id FROM board_categories WHERE name = '자유게시판' LIMIT 1),
  auth.uid(),
  '첫 번째 게시글입니다',
  '커뮤니티에서 자유롭게 소통해요!'
WHERE auth.uid() IS NOT NULL;
```

---

## 🎯 프론트엔드 접근

데이터베이스 설정이 완료되면 다음 경로로 접근할 수 있습니다:

- **커뮤니티 페이지**: `https://your-domain.com/community`
- **네비게이션**: 헤더 우측 "커뮤니티" 버튼

---

## 🔧 문제 해결

### 카테고리가 표시되지 않는 경우

```sql
-- board_categories 테이블 확인
SELECT * FROM board_categories WHERE is_active = true;

-- 데이터가 없으면 초기 카테고리 생성 (2단계 참조)
```

### RLS 정책 문제

```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename IN ('board_categories', 'posts', 'comments');

-- RLS가 비활성화된 경우 활성화
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

### 게시글 작성 실패

```sql
-- user_profiles 테이블에 프로필이 있는지 확인
SELECT * FROM user_profiles WHERE id = auth.uid();

-- 없으면 프로필 생성
INSERT INTO user_profiles (id, email, nickname)
SELECT 
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  (SELECT email FROM auth.users WHERE id = auth.uid())
WHERE auth.uid() IS NOT NULL;
```

---

## 📊 데이터베이스 스키마 요약

### board_categories (게시판 카테고리)
- `id` (uuid, PK)
- `name` (text) - 카테고리 이름
- `description` (text) - 설명
- `icon` (text) - 아이콘 이모지
- `order` (integer) - 정렬 순서
- `is_active` (boolean) - 활성화 여부
- `created_at` (timestamp)

### posts (게시글)
- `id` (uuid, PK)
- `board_category_id` (uuid, FK) - 게시판 카테고리
- `user_id` (uuid, FK) - 작성자
- `title` (text) - 제목
- `content` (text) - 내용
- `view_count` (integer) - 조회수
- `like_count` (integer) - 좋아요 수
- `comment_count` (integer) - 댓글 수
- `is_notice` (boolean) - 공지사항 여부
- `notice_order` (integer) - 공지사항 순서
- `is_deleted` (boolean) - 삭제 여부
- `created_at`, `updated_at`

### comments (댓글)
- `id` (uuid, PK)
- `post_id` (uuid, FK) - 게시글
- `user_id` (uuid, FK) - 작성자
- `parent_comment_id` (uuid, FK) - 부모 댓글 (답글)
- `content` (text) - 내용
- `like_count` (integer) - 좋아요 수
- `is_deleted` (boolean) - 삭제 여부
- `created_at`, `updated_at`

### likes (좋아요)
- `id` (uuid, PK)
- `user_id` (uuid, FK) - 사용자
- `target_type` (text) - 'post' 또는 'comment'
- `target_id` (uuid) - 대상 ID
- `created_at`

### reports (신고)
- `id` (uuid, PK)
- `reporter_id` (uuid, FK) - 신고자
- `target_type` (text) - 'post' 또는 'comment'
- `target_id` (uuid) - 대상 ID
- `reason` (text) - 신고 사유
- `status` (text) - 처리 상태
- `created_at`, `resolved_at`

---

## 📝 참고 문서

- `COMMUNITY_DEV_TEST_GUIDE.md` - 개발 테스트 가이드
- `COMMUNITY_TROUBLESHOOTING.md` - 문제 해결 가이드
- `DIAGNOSE_COMMUNITY.sql` - 진단 쿼리
- `QUICK_FIX_COMMUNITY.sql` - 빠른 수정 쿼리

---

## ✨ 완료 후 확인사항

1. ✅ 커뮤니티 페이지 접근 가능
2. ✅ 게시판 카테고리 표시
3. ✅ 공지사항 표시 (있는 경우)
4. ✅ 게시글 목록 표시
5. ✅ 검색 및 필터 작동
6. ✅ 글쓰기 버튼 표시

---

## 🎉 설치 완료!

모든 단계를 완료하셨다면 커뮤니티 기능을 사용할 준비가 되었습니다!

문제가 발생하면 `COMMUNITY_TROUBLESHOOTING.md`를 참조하거나 콘솔 로그를 확인하세요.
