# 배포 완료 - 2026년 5월 20일

## 배포 내용

### 1. 프론트엔드 변경사항
- ✅ EventManagementPage 제거 (더 이상 사용하지 않음)
- ✅ 홈페이지에서 직접 행사 추가/삭제 기능 구현
- ✅ 소프트 삭제 기능 구현 (복구 가능)
- ✅ 삭제된 행사 관리 페이지 추가 (`/admin/deleted-events`)
- ✅ 전시장 드롭다운 선택 (지역별 그룹화)
- ✅ 2단계 삭제 확인 절차

### 2. 배포 상태
- ✅ 프론트엔드 빌드 완료
- ✅ Vercel 배포 완료
  - Production URL: https://hokex.vercel.app
  - Inspect URL: https://vercel.com/barmasulsas-projects/hokex/AZ4ZJFHGHirja1pUVDHrkxevvuQR

### 3. 수원메쎄 누락 행사
- ⚠️ 이미 DB에 존재하는 것으로 확인됨 (중복 제약 조건 위반)
- 4개 행사 모두 DB에 있음

## 🚨 중요: DB 마이그레이션 필요

프론트엔드는 배포되었지만, **DB 마이그레이션을 실행해야 소프트 삭제 기능이 작동합니다.**

### DB 마이그레이션 실행 방법

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **마이그레이션 SQL 실행**
   
   아래 SQL을 복사하여 실행:

```sql
-- 소프트 삭제를 위한 deleted_at 컬럼 추가
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- deleted_at 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- 기존 RLS 정책 업데이트: deleted_at이 NULL인 것만 조회
DROP POLICY IF EXISTS "Anyone can view events" ON events;
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT
  USING (deleted_at IS NULL);

-- 관리자는 삭제된 행사도 볼 수 있도록 별도 정책 추가
CREATE POLICY "Admins can view deleted events" ON events
  FOR SELECT
  USING (
    deleted_at IS NOT NULL 
    AND auth.jwt() ->> 'email' IN (
      SELECT email FROM admin_users WHERE is_active = true
    )
  );

COMMENT ON COLUMN events.deleted_at IS '소프트 삭제 시간 (NULL이면 활성 상태)';
```

4. **실행 확인**
   - "Run" 버튼 클릭
   - 성공 메시지 확인

## 테스트 체크리스트

DB 마이그레이션 후 다음 항목들을 테스트하세요:

### 일반 사용자
- [ ] 홈페이지 접속 가능
- [ ] 행사 목록 정상 표시
- [ ] 삭제된 행사는 보이지 않음
- [ ] 삭제된 행사 페이지 접근 불가

### 관리자
- [ ] 관리자 모드 ON/OFF 가능
- [ ] 행사 추가 버튼 표시 (행사 개수 줄 오른쪽)
- [ ] 행사 추가 모달 열림
- [ ] 전시장 드롭다운 선택 가능 (지역별 그룹화)
- [ ] 전시장 선택 시 지역 자동 설정
- [ ] 행사 추가 성공
- [ ] 행사 카드에 삭제 버튼 표시 (🗑️)
- [ ] 삭제 버튼 클릭 시 2단계 확인
- [ ] 행사 삭제 후 목록에서 사라짐
- [ ] 헤더에 "🗑️ 삭제된 행사" 링크 표시
- [ ] 삭제된 행사 페이지 접근 가능
- [ ] 삭제된 행사 목록 표시
- [ ] 행사 복구 기능 작동
- [ ] 복구된 행사 홈페이지에 다시 표시
- [ ] 영구 삭제 기능 작동 (2단계 확인)

## 변경된 파일

### 삭제된 파일
- `hokex-front/src/pages/EventManagementPage.tsx`
- `hokex-front/src/pages/EventManagementPage.css`

### 수정된 파일
- `hokex-front/src/App.tsx` (라우트 및 헤더 링크 수정)
- `hokex-front/src/pages/HomePage.tsx` (행사 추가/삭제 기능)
- `hokex-front/src/components/EventCard.tsx` (삭제 버튼 추가)
- `hokex-front/src/App.css` (모달 스타일)

### 신규 파일
- `hokex-front/src/pages/DeletedEventsPage.tsx` (삭제된 행사 관리)
- `hokex-front/supabase-migrations/add-soft-delete-column.sql` (DB 마이그레이션)
- `hokex-front/SOFT_DELETE_DEPLOYMENT.md` (배포 가이드)
- `hokex-front/DEPLOYMENT_COMPLETE.md` (이 파일)

## 다음 단계

1. ✅ 프론트엔드 배포 완료
2. ⏳ **DB 마이그레이션 실행** (위 SQL 실행)
3. ⏳ 테스트 체크리스트 확인
4. ⏳ 실제 웹사이트에서 기능 테스트

## 롤백 방법

문제 발생 시:

### 프론트엔드 롤백
```bash
cd hokex-front
vercel rollback
```

### DB 롤백
```sql
-- RLS 정책 원복
DROP POLICY IF EXISTS "Admins can view deleted events" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;

CREATE POLICY "Anyone can view events" ON events
  FOR SELECT
  USING (true);

-- deleted_at 컬럼 제거 (선택사항)
ALTER TABLE events DROP COLUMN IF EXISTS deleted_at;
```

## 참고 문서
- `SOFT_DELETE_DEPLOYMENT.md` - 소프트 삭제 기능 상세 가이드
- `supabase-migrations/add-soft-delete-column.sql` - DB 마이그레이션 SQL
