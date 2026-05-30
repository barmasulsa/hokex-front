# 알림 생성 실패 - 빠른 해결 가이드

## ⚡ 빠른 해결 (3단계)

### 1️⃣ 파일 열기
`fix-announcement-with-admin-table.sql` 파일을 열어서 **전체 내용을 복사**하세요.

### 2️⃣ Supabase에서 실행
1. Supabase 대시보드 접속
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. 복사한 내용을 붙여넣기
4. **Run** 버튼 클릭

### 3️⃣ 테스트
1. 관리자 페이지 접속
2. "알림 관리" 탭 클릭
3. "새 알림 추가" 버튼 클릭
4. 알림 정보 입력 후 저장
5. ✅ 성공 메시지 확인!

---

## 🔍 여전히 실패하는 경우

### 진단 실행
1. `diagnose-announcement-issue.sql` 파일 열기
2. 전체 내용 복사
3. Supabase SQL Editor에 붙여넣기
4. Run 버튼 클릭
5. 결과 확인:
   - `table_exists`: true여야 함
   - `rowsecurity`: true여야 함
   - `is_admin`: true여야 함 (현재 사용자가 관리자인 경우)

### 결과에 따른 조치

**`table_exists`가 false인 경우:**
- `create-announcements-table.sql` 파일을 먼저 실행하세요

**`is_admin`이 false인 경우:**
- 현재 로그인한 이메일이 `lcw5506@naver.com` 또는 `admin@hokex.kr`인지 확인
- 다른 이메일이라면 관리자 계정으로 다시 로그인

**`rowsecurity`가 false인 경우:**
- RLS가 비활성화되어 있습니다
- `fix-announcement-with-admin-table.sql`을 다시 실행하세요

---

## 📝 참고

### 생성된 SQL 파일들
1. **fix-announcement-with-admin-table.sql** ⭐ (권장)
   - admin_users 테이블 사용
   - 가장 안정적
   
2. **fix-announcement-rls.sql**
   - auth.users 직접 사용
   - 간단하지만 권한 문제 가능

3. **fix-announcement-simple.sql** (테스트용)
   - RLS 임시 비활성화
   - ⚠️ 보안 위험 - 프로덕션 금지

4. **diagnose-announcement-issue.sql**
   - 문제 진단용
   - 에러 원인 파악

### 자세한 가이드
더 자세한 내용은 `ANNOUNCEMENT_FIX_GUIDE.md` 파일을 참고하세요.

---

## ✅ 성공 확인

알림 생성 후 다음을 확인하세요:
- [ ] 관리자 페이지에서 알림 목록에 표시됨
- [ ] 홈페이지에서 알림 모달이 표시됨
- [ ] "확인" 버튼 클릭 후 다시 표시되지 않음
- [ ] "오늘 하루 보지 않기" 버튼 동작
- [ ] 알림 수정/삭제 가능

---

## 🆘 도움이 필요한 경우

다음 정보를 함께 제공해주세요:
1. 실행한 SQL 파일명
2. 진단 SQL 실행 결과 (스크린샷)
3. 브라우저 콘솔 에러 메시지
4. 현재 로그인한 이메일
