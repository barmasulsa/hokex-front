# 커뮤니티 기능 배포 가이드

## 📋 개요
HOKEX 커뮤니티 기능 - 사용자들이 행사 정보를 공유하고 소통할 수 있는 게시판 시스템

## ✅ 완료된 작업

### 1. 백업 완료
- ✅ 첫 번째 백업: `backups/community-feature-backup/20260621-175424/`
- ✅ 두 번째 전체 백업: `backups/community-feature-backup/20260621-175903/`

### 2. 데이터베이스 마이그레이션 파일 생성
- ✅ `supabase-migrations/create-community-tables.sql`
- ✅ `supabase-migrations/create-community-rpc-functions.sql`

### 3. 서비스 레이어 생성
- ✅ `src/services/communityService.ts`

### 4. 프론트엔드 구현
- ✅ `src/pages/CommunityPage.tsx` (기본 UI)
- ✅ `src/App.tsx` (라우팅 및 네비게이션 추가)

## 🚀 배포 단계

### Step 1: 데이터베이스 마이그레이션 실행

Supabase 대시보드에서 SQL Editor를 열고 다음 순서대로 실행:

#### 1-1. 테이블 생성
```bash
# 파일: supabase-migrations/create-community-tables.sql
```
이 파일을 Supabase SQL Editor에 복사하여 실행

#### 1-2. RPC 함수 생성
```bash
# 파일: supabase-migrations/create-community-rpc-functions.sql
```
이 파일을 Supabase SQL Editor에 복사하여 실행

### Step 2: 테이블 및 RLS 정책 확인

```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('board_categories', 'posts', 'comments', 'likes', 'reports');

-- 기본 데이터 확인
SELECT * FROM board_categories ORDER BY "order";

-- RLS 활성화 확인
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('board_categories', 'posts', 'comments', 'likes', 'reports');
```

예상 결과:
- 5개 테이블 모두 존재
- board_categories에 5개 카테고리 데이터 존재
- 모든 테이블의 rowsecurity = true

### Step 3: 프론트엔드 빌드 및 배포

```bash
# 의존성 설치 (이미 완료되었다면 스킵)
npm install

# 타입 체크
npm run type-check

# 빌드
npm run build

# Vercel 배포
vercel --prod
```

### Step 4: 배포 후 테스트

#### 4-1. 기본 기능 테스트
1. **네비게이션 확인**
   - 헤더에 "커뮤니티" 버튼이 보이는지 확인
   - 클릭 시 `/community` 페이지로 이동하는지 확인

2. **게시판 카테고리 확인**
   - 왼쪽 사이드바에 5개 게시판이 표시되는지 확인:
     * 📌 전체
     * 💬 자유게시판
     * 📢 홍보게시판
     * 💼 채용게시판
     * 👥 스태프/단기알바

3. **권한 확인**
   - **비로그인**: 게시글 목록 조회만 가능
   - **로그인**: "글쓰기" 버튼이 표시되는지 확인

#### 4-2. 데이터베이스 연결 테스트
```sql
-- 게시판 카테고리 조회 테스트
SELECT * FROM board_categories WHERE is_active = true ORDER BY "order";

-- 결과: 5개 행 반환되어야 함
```

## 📁 생성된 파일 목록

### 데이터베이스
- `supabase-migrations/create-community-tables.sql`
- `supabase-migrations/create-community-rpc-functions.sql`

### 프론트엔드
- `src/services/communityService.ts`
- `src/pages/CommunityPage.tsx`
- `src/App.tsx` (수정)

### 문서
- `COMMUNITY_FEATURE_DEPLOYMENT.md` (이 파일)

## 🎯 Phase 1 (MVP) 구현 상태

### ✅ 완료된 기능
1. 데이터베이스 스키마 설계 및 생성
   - board_categories 테이블
   - posts 테이블 (board_category_id 포함)
   - comments 테이블
   - likes 테이블
   - reports 테이블
2. RLS 정책 설정
3. 트리거 함수 (좋아요 수, 댓글 수 자동 업데이트)
4. 게시판 카테고리 사이드바 UI
5. 게시글 목록 페이지 (카테고리 필터링 포함)
6. 네비게이션 추가 ("커뮤니티" 버튼)

### 🔄 다음 구현 예정
7. 게시글 상세 페이지
8. 게시글 작성 기능
9. 댓글 작성/조회 기능
10. 게시글/댓글 수정/삭제
11. 좋아요 기능
12. 답글 기능
13. 신고 기능

## 🔧 트러블슈팅

### 문제 1: "커뮤니티" 버튼이 보이지 않음
**해결**: 로그인 상태를 확인하세요. 로그인한 사용자만 커뮤니티 버튼이 표시됩니다.

### 문제 2: 게시판 카테고리가 표시되지 않음
**해결**: 
```sql
-- Supabase에서 기본 데이터 확인
SELECT * FROM board_categories;

-- 없으면 다시 삽입
INSERT INTO board_categories (id, name, description, icon, "order") VALUES
  ('all', '전체', '모든 게시판', '📌', 0),
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1),
  ('promotion', '홍보게시판', '행사 및 제품 홍보', '📢', 2),
  ('job', '채용게시판', '정규직/계약직 채용', '💼', 3),
  ('staff', '스태프/단기알바', '행사 스태프 및 단기 알바', '👥', 4)
ON CONFLICT (id) DO NOTHING;
```

### 문제 3: RLS 정책 오류
**해결**:
```sql
-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('board_categories', 'posts', 'comments', 'likes', 'reports');

-- RLS 정책이 없으면 create-community-tables.sql 파일을 다시 실행
```

## 📊 데이터 모델 요약

### board_categories
- `id` (PK): 게시판 ID
- `name`: 게시판 이름
- `icon`: 아이콘 이모지
- `order`: 표시 순서

### posts
- `id` (PK): 게시글 ID
- `board_category_id` (FK): 게시판 카테고리
- `user_id` (FK): 작성자
- `title`: 제목 (5-100자)
- `content`: 내용 (10-5000자)
- `view_count`, `like_count`, `comment_count`: 카운터

### comments
- `id` (PK): 댓글 ID
- `post_id` (FK): 게시글
- `parent_comment_id` (FK): 부모 댓글 (답글용)
- `content`: 내용 (1-1000자)

### likes
- `user_id`, `target_type`, `target_id`: 복합 UNIQUE

### reports
- 신고 접수 및 관리

## 🔄 롤백 방법

만약 문제가 발생하면 백업에서 복원:

```bash
# 백업 위치
backups/community-feature-backup/20260621-175903/

# 파일 복원
# 1. src/ 폴더의 변경사항 되돌리기
# 2. App.tsx 원래 버전으로 복원

# 데이터베이스 테이블 삭제 (필요시)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS board_categories CASCADE;
DROP FUNCTION IF EXISTS increment_post_view_count(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_post_comment_count();
DROP FUNCTION IF EXISTS update_like_count();
```

## 📝 참고사항

1. **스타일링**: 현재는 기본 스타일만 적용되어 있습니다. App.css 또는 별도의 CSS 파일에 스타일을 추가해야 합니다.

2. **HomePage 사이드바 스타일 재사용**: CommunityPage는 HomePage의 `.filter-sidebar` 클래스를 재사용하여 동일한 디자인을 유지합니다.

3. **향후 확장**: 요구사항 문서(`.kiro/specs/community-feature/requirements.md`)를 참고하여 추가 기능을 구현할 수 있습니다.

## ✅ 배포 체크리스트

- [ ] 데이터베이스 마이그레이션 실행 완료
- [ ] RPC 함수 생성 완료
- [ ] 기본 카테고리 데이터 삽입 확인
- [ ] RLS 정책 활성화 확인
- [ ] 프론트엔드 빌드 성공
- [ ] Vercel 배포 완료
- [ ] "커뮤니티" 버튼 표시 확인
- [ ] 게시판 카테고리 목록 표시 확인
- [ ] 카테고리 클릭 시 필터링 동작 확인

## 🎉 배포 완료 후

커뮤니티 기능의 기본 구조가 완성되었습니다! 
다음 단계로 게시글 작성, 상세 페이지, 댓글 기능 등을 추가로 구현할 수 있습니다.

---

**작성일**: 2026-06-21  
**버전**: Phase 1 MVP  
**백업 위치**: `backups/community-feature-backup/20260621-175903/`
