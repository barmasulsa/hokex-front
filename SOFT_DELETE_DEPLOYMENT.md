# 소프트 삭제 기능 배포 가이드

## 개요
행사 삭제 시 실제로 DB에서 삭제하지 않고 `deleted_at` 컬럼에 삭제 시간을 기록하는 **소프트 삭제(Soft Delete)** 방식으로 변경했습니다.

## 주요 기능

### 1. 안전한 삭제
- **2단계 확인**: 삭제 버튼 클릭 시 2번의 확인 절차
- **소프트 삭제**: 실제 DB에서 삭제하지 않고 `deleted_at`에 시간 기록
- **복구 가능**: 관리자 페이지에서 언제든지 복구 가능

### 2. 삭제된 행사 관리 페이지
- **경로**: `/admin/deleted-events`
- **기능**:
  - 삭제된 행사 목록 조회
  - 행사 복구 (deleted_at을 NULL로 변경)
  - 영구 삭제 (실제 DB에서 삭제)

### 3. RLS 정책 업데이트
- 일반 사용자: `deleted_at IS NULL`인 행사만 조회
- 관리자: 삭제된 행사도 조회 가능

## 배포 순서

### 1. DB 마이그레이션 실행

Supabase SQL Editor에서 실행:

```bash
# 파일 위치
hokex-front/supabase-migrations/add-soft-delete-column.sql
```

또는 직접 실행:

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
```

### 2. 프론트엔드 빌드 및 배포

```bash
cd hokex-front
npm run build
vercel --prod
```

## 변경 사항

### 파일 변경
1. **hokex-front/src/pages/HomePage.tsx**
   - `handleDelete` 함수: 소프트 삭제로 변경
   - 2단계 확인 추가

2. **hokex-front/src/pages/DeletedEventsPage.tsx** (신규)
   - 삭제된 행사 목록 페이지
   - 복구 및 영구 삭제 기능

3. **hokex-front/src/App.tsx**
   - DeletedEventsPage import 추가
   - `/admin/deleted-events` 라우트 추가
   - 헤더에 "🗑️ 삭제된 행사" 링크 추가

4. **hokex-front/supabase-migrations/add-soft-delete-column.sql** (신규)
   - DB 마이그레이션 스크립트

## 사용 방법

### 행사 삭제
1. 관리자 모드 ON
2. 행사 카드의 🗑️ 버튼 클릭
3. 첫 번째 확인: "정말 삭제하시겠습니까?"
4. 두 번째 확인: "⚠️ 최종 확인"
5. 삭제 완료 (복구 가능 안내)

### 행사 복구
1. 헤더의 "🗑️ 삭제된 행사" 클릭
2. 삭제된 행사 목록에서 "↻ 복구" 버튼 클릭
3. 확인 후 복구 완료

### 영구 삭제
1. 삭제된 행사 목록에서 "🗑️ 영구삭제" 버튼 클릭
2. 2단계 확인 (복구 불가 경고)
3. 영구 삭제 완료 (복구 불가)

## 주의사항

1. **기존 데이터**: 기존에 삭제된 행사는 복구 불가 (이미 DB에서 삭제됨)
2. **RLS 정책**: 관리자만 삭제된 행사 조회 가능
3. **영구 삭제**: 신중하게 사용 (복구 불가)

## 테스트 체크리스트

- [ ] DB 마이그레이션 성공
- [ ] 일반 사용자: 삭제된 행사 안 보임
- [ ] 관리자: 행사 삭제 시 2단계 확인
- [ ] 관리자: 삭제 후 목록에서 사라짐
- [ ] 관리자: 삭제된 행사 페이지 접근 가능
- [ ] 관리자: 행사 복구 성공
- [ ] 관리자: 복구된 행사 홈페이지에 표시
- [ ] 관리자: 영구 삭제 성공
- [ ] 일반 사용자: 삭제된 행사 페이지 접근 불가

## 롤백 방법

문제 발생 시:

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

프론트엔드는 이전 버전으로 재배포.
