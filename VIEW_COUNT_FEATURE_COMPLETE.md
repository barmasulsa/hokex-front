# 행사 조회수 기능 구현 완료

## 문제 해결

### 로컬 서버 시작 오류
**문제**: TypeScript 컴파일 오류로 인해 로컬 서버가 시작되지 않음
**원인**: `BannerManagementPage.tsx`에서 `Region`과 `Venue` 타입 import 오류
- `Region`은 `Object.values(Region)`로 값으로 사용되므로 일반 import 필요
- `Venue`는 타입으로만 사용되므로 type-only import 필요

**해결**:
```typescript
// 수정 전
import { Region, Venue, REGION_VENUE_MAP } from '../types/core';

// 수정 후
import { Region, type Venue, REGION_VENUE_MAP } from '../types/core';
```

## 구현된 기능

### 1. 데이터베이스 마이그레이션
- ✅ `supabase-migrations/add-view-count-column.sql`: events 테이블에 view_count 컬럼 추가
- ✅ `supabase-migrations/create-increment-view-count-function.sql`: 원자적 조회수 증가 함수

### 2. 프론트엔드 구현

#### HomePage.tsx
- ✅ `showViewCounts` 상태 추가
- ✅ "조회수 보기" 토글 버튼 (연보라색 #B39DDB)
- ✅ 관리자 전용 기능

#### EventCard.tsx
- ✅ 조회수 배지 표시 (눈 아이콘 + 숫자)
- ✅ 카드 이미지 우측 하단에 배치
- ✅ 관리자 모드 + 조회수 모드 활성화 시에만 표시

#### EventDetailPage.tsx
- ✅ 페이지 로드 시 `incrementViewCount()` 호출
- ✅ 메모리 큐에 조회수 기록

#### eventService.ts
- ✅ `incrementViewCount()`: 메모리 큐에 조회수 저장
- ✅ `flushViewCounts()`: 1분마다 배치 업데이트
- ✅ `fetchViewCountStats()`: 조회수 통계 조회 (필터 지원)
- ✅ `fetchSavedEventStats()`: 찜 목록 통계 조회 (필터 지원)
- ✅ `ViewCountStats`, `SavedEventStats`, `ViewCountStatsFilters` 인터페이스

#### App.tsx
- ✅ 1분 간격으로 `flushViewCounts()` 호출
- ✅ 배치 처리로 DB 부하 최소화

#### types/core.ts
- ✅ EventRecord에 `view_count?: number` 추가

#### App.css
- ✅ `.admin-view-count-toggle-btn` 스타일 (연보라색)

### 3. 배너 관리 페이지 - 행사 조회수 탭

#### BannerManagementPage.tsx
**새로운 탭**: "👁️ 행사 조회수" (방문자 통계와 분리)

**통계 타입 선택**:
- 👁️ 조회수
- ❤️ 찜 목록

**필터 기능**:
1. **표시 개수**:
   - 프리셋 버튼: 상위 3개, 5개, 10개, 50개, 100개
   - 커스텀 입력: 1~1000 사이 숫자 직접 입력

2. **지역 필터**:
   - 전체 / 서울 / 수도권 / 충청도 / 전라도 / 강원도 / 경상도 / 제주도

3. **전시장 필터**:
   - 지역 선택 시 활성화
   - 해당 지역의 전시장 목록 표시

**통계 테이블**:
- 순위 (상위 3위는 금/은/동 배지)
- 행사명 (클릭 시 새 탭에서 상세 페이지 열림)
- 지역
- 전시장
- 기간
- 조회수 또는 찜 수

**자동 업데이트**:
- 1분마다 통계 자동 갱신

#### BannerManagementPage.css
- ✅ 필터 컨트롤 스타일
- ✅ 버튼 스타일 (프리셋, 커스텀 입력)
- ✅ 테이블 스타일
- ✅ 순위 배지 스타일 (금/은/동)

## 성능 최적화

### 배치 처리
- 조회수를 메모리에 누적
- 1분마다 DB에 일괄 업데이트
- 예상 부하: 10,000명/일 = ~7회 DB 업데이트/분
- Supabase 무료 티어 내 (<9% 사용량)

## 다음 단계

### 1. 데이터베이스 마이그레이션 적용
Supabase SQL Editor에서 다음 파일들을 순서대로 실행:

```sql
-- 1. view_count 컬럼 추가
-- 파일: supabase-migrations/add-view-count-column.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_events_view_count ON events(view_count DESC);

-- 2. 조회수 증가 함수 생성
-- 파일: supabase-migrations/create-increment-view-count-function.sql
CREATE OR REPLACE FUNCTION increment_view_count(event_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events
  SET view_count = COALESCE(view_count, 0) + increment_by
  WHERE id = event_id;
END;
$$;
```

### 2. 배포
```bash
cd hokex-front
git add .
git commit -m "feat: 행사 조회수 기능 구현 완료"
git push origin main
```

Vercel이 자동으로 배포를 시작합니다.

### 3. 테스트

#### 로컬 테스트
1. ✅ 로컬 서버 실행 중 (http://localhost:5173)
2. 관리자로 로그인
3. "조회수 보기" 버튼 클릭 (연보라색)
4. 행사 카드에 조회수 배지 표시 확인
5. 행사 상세 페이지 방문 시 조회수 증가 확인
6. 1분 대기 후 배치 업데이트 확인

#### 배너 관리 페이지 테스트
1. 관리자로 로그인
2. 배너 관리 페이지 접속
3. "👁️ 행사 조회수" 탭 클릭
4. 필터 기능 테스트:
   - 상위 3개, 5개, 10개 등 프리셋 버튼
   - 커스텀 숫자 입력 (예: 25)
   - 지역 선택 (예: 서울)
   - 전시장 선택 (예: 코엑스)
5. 통계 타입 전환:
   - 👁️ 조회수
   - ❤️ 찜 목록
6. 1분 대기 후 자동 업데이트 확인

#### 프로덕션 테스트
배포 완료 후 동일한 테스트 수행

## 파일 목록

### 데이터베이스
- `hokex-front/supabase-migrations/add-view-count-column.sql`
- `hokex-front/supabase-migrations/create-increment-view-count-function.sql`

### 프론트엔드
- `hokex-front/src/pages/HomePage.tsx`
- `hokex-front/src/components/EventCard.tsx`
- `hokex-front/src/pages/EventDetailPage.tsx`
- `hokex-front/src/services/eventService.ts`
- `hokex-front/src/App.tsx`
- `hokex-front/src/types/core.ts`
- `hokex-front/src/App.css`
- `hokex-front/src/pages/BannerManagementPage.tsx`
- `hokex-front/src/pages/BannerManagementPage.css`

## 주요 변경 사항

### 타입 Import 수정
```typescript
// BannerManagementPage.tsx
import { Region, type Venue, REGION_VENUE_MAP } from '../types/core';
```
- `Region`: 값으로 사용 (Object.values)하므로 일반 import
- `Venue`: 타입으로만 사용하므로 type-only import

## 상태

✅ **로컬 서버 정상 작동**
✅ **TypeScript 컴파일 오류 해결**
✅ **모든 기능 구현 완료**
⏳ **데이터베이스 마이그레이션 대기 중**
⏳ **프로덕션 배포 대기 중**
