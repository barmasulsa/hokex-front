# 알림 생성 실패 문제 해결 가이드

## 문제 상황
관리자 페이지에서 알림 생성 시 "알림 생성에 실패했습니다" 에러 발생

## 원인 분석
RLS(Row Level Security) 정책이 제대로 작동하지 않아 관리자 권한 확인 실패

## 해결 방법 (3가지 옵션)

### 🎯 방법 1: 관리자 테이블 사용 (권장)
가장 확실하고 안전한 방법입니다.

**실행 파일:** `fix-announcement-with-admin-table.sql`

**장점:**
- 가장 안정적
- 관리자 관리가 용이
- 프로덕션 환경에 적합

**단점:**
- admin_users 테이블이 필요

**실행 순서:**
1. Supabase SQL Editor에서 `fix-announcement-with-admin-table.sql` 실행
2. 쿼리 결과에서 관리자 이메일이 표시되는지 확인
3. 관리자 페이지에서 알림 생성 테스트

---

### 🔧 방법 2: RLS 정책 수정
auth.users 테이블을 직접 사용하는 방법입니다.

**실행 파일:** `fix-announcement-rls.sql`

**장점:**
- 추가 테이블 불필요
- 간단한 구조

**단점:**
- auth.users 접근 권한에 따라 작동하지 않을 수 있음

**실행 순서:**
1. Supabase SQL Editor에서 `fix-announcement-rls.sql` 실행
2. "현재 사용자 확인" 쿼리 결과에서 `is_admin`이 `true`인지 확인
3. `false`라면 현재 로그인한 이메일이 관리자 목록에 없는 것
4. 관리자 페이지에서 알림 생성 테스트

---

### 🧪 방법 3: RLS 임시 비활성화 (테스트용)
문제 원인을 파악하기 위한 임시 방법입니다.

**실행 파일:** `fix-announcement-simple.sql`

**장점:**
- 즉시 작동
- 문제 원인 파악 가능

**단점:**
- ⚠️ 보안 위험 (모든 사용자가 알림 관리 가능)
- ⚠️ 프로덕션 환경에서 사용 금지
- ⚠️ 테스트 후 반드시 RLS 재활성화 필요

**실행 순서:**
1. Supabase SQL Editor에서 `fix-announcement-simple.sql` 실행
2. 관리자 페이지에서 알림 생성 테스트
3. **성공:** RLS 정책 문제 → 방법 1 또는 2 사용
4. **실패:** 다른 문제 (테이블 구조, 권한 등) → 진단 SQL 실행
5. **테스트 완료 후 반드시 RLS 재활성화:**
   ```sql
   ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
   ```

---

## 진단 도구

### 📋 진단 SQL 실행
문제 원인을 파악하기 위한 진단 쿼리입니다.

**실행 파일:** `diagnose-announcement-issue.sql`

**실행 순서:**
1. Supabase SQL Editor에서 `diagnose-announcement-issue.sql` 파일의 내용을 복사하여 실행
2. 각 쿼리 결과를 순서대로 확인:
   - **테이블 존재 확인:** `table_exists`가 `true`여야 함
   - **테이블 구조 확인:** 모든 컬럼이 올바르게 생성되었는지 확인
   - **RLS 활성화 확인:** `rowsecurity`가 `true`여야 함
   - **RLS 정책 확인:** 정책이 올바르게 설정되었는지 확인
   - **현재 사용자 확인:** 로그인한 사용자 정보 확인
   - **이메일 확인:** 관리자 이메일인지 확인
   - **알림 조회 테스트:** 조회 권한이 있는지 확인

---

## 권장 해결 순서

### 1단계: 진단
1. `diagnose-announcement-issue.sql` 파일을 열어서 내용을 복사
2. Supabase SQL Editor에 붙여넣기
3. 실행하여 모든 쿼리 결과를 확인하고 문제 파악

### 2단계: 해결
1. **방법 1 (권장):** `fix-announcement-with-admin-table.sql` 파일을 열어서 내용을 복사
2. Supabase SQL Editor에 붙여넣기
3. 실행
   
   **또는**
   
1. **방법 2:** `fix-announcement-rls.sql` 파일을 열어서 내용을 복사
2. Supabase SQL Editor에 붙여넣기
3. 실행

### 3단계: 테스트
1. 관리자 페이지 접속
2. "알림 관리" 탭 클릭
3. "새 알림 추가" 버튼 클릭
4. 알림 정보 입력:
   - 종류: 일반 알림 / 중요 공지 / 업데이트 소식
   - 제목: 테스트 알림
   - 내용: 테스트 내용입니다
   - 시작일: 오늘
   - 종료일: 7일 후
   - 활성화: 체크
5. "저장" 버튼 클릭
6. 성공 메시지 확인

### 4단계: 확인
1. 홈페이지 접속
2. 알림 모달이 표시되는지 확인
3. "확인" 버튼 클릭 후 다시 표시되지 않는지 확인
4. "오늘 하루 보지 않기" 버튼 동작 확인

---

## 문제가 계속되는 경우

### 체크리스트
- [ ] `create-announcements-table.sql`을 실행했는가?
- [ ] 현재 로그인한 이메일이 `lcw5506@naver.com` 또는 `admin@hokex.kr`인가?
- [ ] Supabase 프로젝트가 올바른가? (hokex-front 프로젝트)
- [ ] 브라우저 콘솔에 에러 메시지가 있는가?
- [ ] 네트워크 탭에서 API 요청이 실패하는가?

### 추가 진단
```sql
-- 1. 현재 사용자 확인
SELECT 
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- 2. admin_users 테이블 확인
SELECT * FROM admin_users;

-- 3. announcements 테이블 권한 확인
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'announcements';

-- 4. RLS 정책 상세 확인
SELECT * FROM pg_policies WHERE tablename = 'announcements';
```

---

## 성공 후 확인사항

### ✅ 알림 기능 체크리스트
- [ ] 알림 생성 성공
- [ ] 알림 수정 성공
- [ ] 알림 삭제 성공
- [ ] 알림 활성화/비활성화 토글 성공
- [ ] 홈페이지에서 알림 모달 표시
- [ ] "확인" 버튼 클릭 후 다시 표시되지 않음
- [ ] "오늘 하루 보지 않기" 버튼 동작
- [ ] 알림 종류별 아이콘 및 색상 표시
- [ ] 기간 외 알림은 표시되지 않음

---

## 참고 정보

### 알림 종류
- 🔔 **일반 알림** (normal): 파란색, 일반적인 공지사항
- ⚠️ **중요 공지** (important): 빨간색, 긴급하거나 중요한 내용
- ✨ **업데이트 소식** (update): 초록색, 새로운 기능이나 개선사항

### 성능 영향
- 알림 기능은 최적화에 거의 영향 없음
- 홈페이지 로드 시 단 1개의 알림만 조회 (`.limit(1)`)
- 인덱스 최적화 (`idx_announcements_active_dates`)
- localStorage 기반 클라이언트 캐싱으로 중복 조회 방지
- 기존 행사 데이터 로드와 독립적으로 실행

### 관련 파일
- **테이블 생성:** `supabase-migrations/create-announcements-table.sql`
- **타입 정의:** `src/types/announcement.ts`
- **서비스:** `src/services/announcementService.ts`
- **스토리지:** `src/utils/announcementStorage.ts`
- **모달 컴포넌트:** `src/components/AnnouncementModal.tsx`
- **관리 페이지:** `src/pages/BannerManagementPage.tsx`
- **홈페이지 통합:** `src/pages/HomePage.tsx`

---

## 문의
문제가 해결되지 않으면 다음 정보를 함께 제공해주세요:
1. 실행한 SQL 파일명
2. 진단 SQL 실행 결과
3. 브라우저 콘솔 에러 메시지
4. 네트워크 탭의 실패한 API 요청 정보
