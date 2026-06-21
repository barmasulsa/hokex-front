# 커뮤니티 기능 개발 서버 테스트 가이드

## 🎯 개발 환경 테스트용

이 가이드는 로컬 개발 서버에서 커뮤니티 기능을 테스트하기 위한 것입니다.

## 📋 사전 준비

### 1. Supabase SQL Editor에서 마이그레이션 실행

#### Step 1: 테이블 생성
1. Supabase Dashboard → SQL Editor 열기
2. `supabase-migrations/create-community-tables.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행 (Run)

#### Step 2: RPC 함수 생성
1. `supabase-migrations/create-community-rpc-functions.sql` 파일 내용 복사
2. SQL Editor에 붙여넣고 실행 (Run)

### 2. 마이그레이션 확인

SQL Editor에서 다음 쿼리로 확인:

```sql
-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('board_categories', 'posts', 'comments', 'likes', 'reports');

-- 기본 데이터 확인
SELECT * FROM board_categories ORDER BY "order";
```

예상 결과:
- 5개 테이블 존재
- board_categories에 5개 카테고리 존재

## 🚀 개발 서버 시작

```bash
# hokex-front 폴더에서
cd hokex-front

# 개발 서버 시작
npm run dev
```

서버가 시작되면: `http://localhost:5173` (또는 표시된 URL)

## ✅ 테스트 체크리스트

### 1. 네비게이션 확인
- [ ] 로그인 후 헤더에 "커뮤니티" 버튼 표시 확인
- [ ] "커뮤니티" 버튼 클릭 시 `/community` 페이지 이동 확인

### 2. 커뮤니티 페이지 UI 확인
- [ ] **왼쪽 사이드바** 표시 확인
  * 📌 전체
  * 💬 자유게시판
  * 📢 홍보게시판
  * 💼 채용게시판
  * 👥 스태프/단기알바
- [ ] 각 게시판 클릭 시 활성화 스타일 변경 확인
- [ ] 오른쪽 메인 영역에 "검색바" + "글쓰기" 버튼 확인
- [ ] 정렬 옵션 (최신순/인기순/조회순) 확인

### 3. 빈 상태 확인
- [ ] 게시글이 없을 때 "📝 아직 게시글이 없습니다" 메시지 표시

### 4. 권한 확인
- [ ] 로그인 상태: "글쓰기" 버튼 표시
- [ ] 비로그인 상태: "글쓰기" 버튼 숨김 (로그아웃 후 확인)

## 🐛 디버깅

### 브라우저 콘솔 확인
F12 → Console 탭에서 에러 확인

### 자주 발생하는 문제

**문제 1: "커뮤니티" 버튼이 안 보임**
- 해결: 로그인 상태 확인 (로그인한 사용자만 표시)

**문제 2: 게시판 카테고리가 안 보임**
```sql
-- Supabase SQL Editor에서 확인
SELECT * FROM board_categories;

-- 데이터가 없으면 다시 삽입
INSERT INTO board_categories (id, name, description, icon, "order") VALUES
  ('all', '전체', '모든 게시판', '📌', 0),
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1),
  ('promotion', '홍보게시판', '행사 및 제품 홍보', '📢', 2),
  ('job', '채용게시판', '정규직/계약직 채용', '💼', 3),
  ('staff', '스태프/단기알바', '행사 스태프 및 단기 알바', '👥', 4)
ON CONFLICT (id) DO NOTHING;
```

**문제 3: 페이지가 로딩 중 상태에서 멈춤**
- 브라우저 콘솔에서 네트워크 에러 확인
- Supabase RLS 정책 확인
```sql
-- RLS 정책 확인
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('board_categories', 'posts');
```

## 📝 테스트 데이터 추가 (선택사항)

게시글이 없어서 UI를 보기 어려우면 테스트 데이터 추가:

```sql
-- 테스트 게시글 추가 (user_id는 본인 UUID로 변경)
INSERT INTO posts (board_category_id, user_id, title, content) VALUES
  ('free', 'YOUR_USER_ID', '첫 번째 테스트 게시글', '안녕하세요! 커뮤니티 테스트 중입니다.'),
  ('job', 'YOUR_USER_ID', '채용 공고 테스트', '전시회 스태프를 모집합니다.');

-- user_id 확인하는 방법
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL';
```

## 🎨 스타일링 확인

현재 기본 스타일만 적용되어 있습니다. HomePage의 `.filter-sidebar` 스타일을 재사용하므로:
- 사이드바 너비, 간격, 색상이 HomePage와 동일해야 함
- 버튼 hover 효과 확인
- 반응형 (모바일에서는 사이드바가 상단 드롭다운으로 변경 예정)

## 🔄 다음 단계 (Phase 2)

현재 Phase 1 (MVP) 완료 상태:
- ✅ 데이터베이스 스키마
- ✅ 게시판 카테고리 사이드바
- ✅ 게시글 목록 (빈 상태)
- ✅ 네비게이션

다음 구현 예정:
- [ ] 게시글 작성 모달/페이지
- [ ] 게시글 상세 페이지
- [ ] 댓글 기능
- [ ] 좋아요 기능

## 💡 참고

- **포트 충돌**: 다른 프로세스가 5173 포트를 사용 중이면 다른 포트로 실행됩니다
- **Hot Reload**: 파일 저장 시 자동 새로고침됩니다
- **백업 위치**: `backups/community-feature-backup/20260621-175903/`

## 🆘 문제 해결

문제가 발생하면:
1. 브라우저 콘솔 확인 (F12 → Console)
2. 터미널의 개발 서버 로그 확인
3. Supabase Dashboard → Logs 확인
4. 백업에서 복원:
   ```bash
   # src/ 폴더 백업에서 복원
   # backups/community-feature-backup/20260621-175903/ 참고
   ```

---

**테스트 시작일**: 2026-06-21  
**Phase**: 1 (MVP)  
**환경**: 개발 서버 (localhost)
