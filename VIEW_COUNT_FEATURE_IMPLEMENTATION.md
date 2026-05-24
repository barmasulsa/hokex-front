# 조회수 기능 구현 완료

## 개요
관리자 전용 조회수 기능이 구현되었습니다. 관리자가 "조회수 보기" 버튼을 활성화하면 각 행사 카드에 조회수가 표시됩니다.

## 구현 내용

### 1. 데이터베이스 변경
- **파일**: `supabase-migrations/add-view-count-column.sql`
- `events` 테이블에 `view_count` 컬럼 추가 (INTEGER, DEFAULT 0)
- 성능을 위한 인덱스 추가

### 2. SQL 함수 생성
- **파일**: `supabase-migrations/create-increment-view-count-function.sql`
- `increment_view_count(event_id, increment_by)` 함수 생성
- 원자적(atomic) 조회수 증가 보장

### 3. 프론트엔드 변경

#### HomePage.tsx
- `showViewCounts` 상태 추가 (조회수 표시 모드)
- "조회수 보기" 토글 버튼 추가 (행사 제거 버튼 오른쪽)
- EventCard에 `showViewCount` prop 전달

#### EventCard.tsx
- `showViewCount` prop 추가
- 조회수 배지 표시 (카드 이미지 우측 하단)
- 눈 아이콘 + 숫자 형태로 표시

#### EventDetailPage.tsx
- 페이지 로드 시 `incrementViewCount()` 호출
- 메모리에 조회수 증가 기록

#### eventService.ts
- `incrementViewCount()`: 메모리에 조회수 기록
- `flushViewCounts()`: 배치로 DB 업데이트
- `mapSupabaseEventToEventRecord()`: view_count 매핑 추가

#### App.tsx
- 1분마다 `flushViewCounts()` 호출
- 컴포넌트 언마운트 시 마지막 flush

#### types/core.ts
- `EventRecord` 인터페이스에 `view_count?: number` 추가

#### App.css
- `.admin-view-count-toggle-btn` 스타일 추가
- 활성화 시 파란색 (#2196F3)

## 사용 방법

### 관리자 모드 활성화
1. 관리자 계정으로 로그인
2. 헤더에서 관리자 모드 켜기 (✏️ 버튼)

### 조회수 보기
1. 홈페이지 상단 "조회수 보기" 버튼 클릭
2. 각 행사 카드 우측 하단에 조회수 배지 표시
3. 다시 클릭하면 숨김

## 성능 최적화

### 배치 처리
- 조회수는 메모리에 누적 후 1분마다 DB 업데이트
- 하루 10,000명 방문 시:
  - 평균 10,000 페이지뷰
  - 1분당 약 7회 DB 업데이트
  - 매우 낮은 DB 부하

### 비용 효율성
- Supabase 무료 티어 내에서 충분히 운영 가능
- 예상 DB 사용량: 전체의 9% 미만

## 배포 순서

1. **데이터베이스 마이그레이션 실행**
   ```bash
   cd hokex-front
   # Supabase SQL Editor에서 실행:
   # 1. supabase-migrations/add-view-count-column.sql
   # 2. supabase-migrations/create-increment-view-count-function.sql
   ```

2. **프론트엔드 배포**
   ```bash
   git add .
   git commit -m "feat: Add admin-only view count feature"
   git push origin main
   ```

3. **Vercel 자동 배포 확인**
   - Vercel이 자동으로 배포
   - 배포 완료 후 테스트

## 테스트 방법

1. 관리자 계정으로 로그인
2. 관리자 모드 활성화
3. "조회수 보기" 버튼 클릭
4. 행사 카드에 조회수 배지 표시 확인
5. 행사 상세 페이지 방문
6. 1분 후 조회수 증가 확인

## 롤백 방법

문제 발생 시 이전 상태로 되돌리기:

```bash
git revert HEAD
git push origin main
```

또는 git tag를 사용한 롤백:

```bash
git checkout before-view-count-feature
git push origin main --force
```

## 주의사항

- 조회수는 관리자만 볼 수 있습니다
- 일반 사용자에게는 표시되지 않습니다
- 조회수는 페이지 로드마다 증가합니다 (중복 방문 포함)
- 배치 업데이트로 인해 실시간 반영은 아닙니다 (최대 1분 지연)

## 향후 개선 사항

- [ ] 중복 방문 필터링 (같은 사용자의 반복 조회 제외)
- [ ] 조회수 통계 페이지 (일별/월별 추이)
- [ ] 인기 행사 순위 (조회수 기준)
- [ ] 조회수 기반 추천 시스템
