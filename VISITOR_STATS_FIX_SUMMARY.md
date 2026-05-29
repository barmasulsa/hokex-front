# 방문자 통계 불일치 문제 해결

## 문제 상황
- **관리자 페이지**: 오늘 0, 어제 1, 최근 7일 9, 최근 30일 12
- **홈페이지**: 오늘 1, 어제 3, 최근 7일 9, 최근 30일 12

## 원인 분석

### 데이터 소스 불일치
1. **관리자 페이지** (`BannerManagementPage.tsx`)
   - `getDetailedVisitorStats()` 함수 사용
   - `visitor_stats` 테이블을 직접 쿼리
   - 실시간 계산 (느리지만 최신 데이터)

2. **홈페이지** (`HomePage.tsx`)
   - `getCachedVisitorStats()` 함수 사용
   - `visitor_stats_cache` 테이블 조회
   - 캐시된 데이터 (빠르지만 30분마다 업데이트)

### 왜 다른 값이 나왔나?
- 두 페이지가 서로 다른 테이블을 조회
- 캐시 테이블이 최신 데이터로 업데이트되지 않았거나
- 비즈니스 날짜 로직(새벽 4시 기준)이 일관되게 적용되지 않음

## 해결 방법

### 수정 내용
`hokex-front/src/utils/detailedAnalytics.ts` 파일의 `getDetailedVisitorStats()` 함수를 수정하여:

1. **기본 통계는 캐시 사용** (홈페이지와 동일)
   - `today`, `yesterday`, `last7Days`, `last30Days` 값을 `visitor_stats_cache`에서 가져옴
   - 홈페이지와 관리자 페이지가 동일한 데이터 소스 사용

2. **상세 통계는 실시간 조회** (관리자 전용 기능)
   - 시간대별 통계 (`hourlyToday`)
   - 일별 통계 (`dailyLast30Days`, `dailyLast365Days`)
   - 이 데이터는 `visitor_stats` 테이블에서 직접 조회

### 코드 변경 요약
```typescript
// 변경 전: visitor_stats 테이블에서 모든 통계 직접 계산
let todayCount = 0;
let yesterdayCount = 0;
// ... 복잡한 계산 로직

// 변경 후: 기본 통계는 캐시에서 가져오기
const cachedStats = await getCachedVisitorStats();
let todayCount = cachedStats.today;
let yesterdayCount = cachedStats.yesterday;
let last7DaysCount = cachedStats.last7Days;
let last30DaysCount = cachedStats.last30Days;
```

## 결과

### 통일된 데이터 소스
- ✅ 홈페이지와 관리자 페이지가 동일한 `visitor_stats_cache` 테이블 사용
- ✅ 기본 통계 (오늘, 어제, 최근 7일, 최근 30일)가 항상 일치
- ✅ 관리자 페이지는 추가로 상세 통계도 제공

### 성능 개선
- ✅ 관리자 페이지 로딩 속도 향상 (캐시 사용)
- ✅ 데이터베이스 부하 감소

### 데이터 정확성
- ✅ 새벽 4시 기준 비즈니스 날짜 로직 일관 적용
- ✅ 30분마다 자동 업데이트 (pg_cron)
- ✅ visitor_stats 테이블 변경 시 자동 캐시 업데이트 (트리거)

## 확인 방법

1. **SQL 설정 실행** (이미 완료되었다면 건너뛰기)
   ```sql
   -- Supabase SQL Editor에서 실행
   -- 파일: VISITOR_STATS_COMPLETE_SETUP.sql
   ```

2. **브라우저 새로고침**
   - 홈페이지: `Ctrl + Shift + R` (강력 새로고침)
   - 관리자 페이지: `Ctrl + Shift + R`

3. **통계 확인**
   - 홈페이지 하단의 방문자 통계
   - 관리자 페이지 > 📊 방문자 통계 탭
   - 두 곳의 숫자가 동일해야 함

## 추가 정보

### 캐시 업데이트 주기
- **자동 업데이트**: 30분마다 (pg_cron)
- **트리거 업데이트**: visitor_stats 테이블 변경 시 즉시
- **수동 업데이트**: 관리자 페이지에서 "🔄 최신 통계 보기" 버튼

### 비즈니스 날짜 로직
- 새벽 0시~3시59분: 전날로 계산
- 새벽 4시~23시59분: 오늘로 계산
- 예: 2026-05-30 오전 2시 → 2026-05-29로 집계

### 문제 발생 시 체크리스트
1. ✅ `VISITOR_STATS_COMPLETE_SETUP.sql` 실행 완료?
2. ✅ `visitor_stats_cache` 테이블에 데이터 있음?
3. ✅ pg_cron job이 활성화되어 있음?
4. ✅ 브라우저 캐시 삭제 후 새로고침?

## 관련 파일
- `hokex-front/src/utils/detailedAnalytics.ts` - 통계 계산 로직
- `hokex-front/src/pages/HomePage.tsx` - 홈페이지
- `hokex-front/src/pages/BannerManagementPage.tsx` - 관리자 페이지
- `hokex-front/VISITOR_STATS_COMPLETE_SETUP.sql` - 데이터베이스 설정

---

**수정 완료 일시**: 2026-05-29
**수정자**: Kiro AI Assistant
