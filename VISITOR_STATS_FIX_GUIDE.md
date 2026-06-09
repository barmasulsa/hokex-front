# 방문자 통계 함수 수정 가이드

## 문제점

```
ERROR: 42703: column "visitor_hash" does not exist
QUERY: SELECT COUNT(DISTINCT visitor_hash) FROM visitor_logs WHERE domain = p_domain ...
```

관리자 페이지의 방문자 통계가 표시되지 않는 문제가 발생했습니다.

## 원인 분석

1. **잘못된 테이블 사용**: `get_visitor_statistics` 함수가 `visitor_logs` 테이블에서 `visitor_hash` 컬럼을 조회하려고 시도
2. **실제 스키마**: `visitor_logs` 테이블에는 `visitor_hash` 컬럼이 없음
3. **올바른 위치**: `visitor_hash`는 `visitor_dedup` 테이블에 존재

## 테이블 구조

### visitor_logs (방문 로그)
- `id`, `site_id`, `timezone`, `page_path`, `page_title`, `referrer`
- `visitor_ip`, `user_agent`, `timestamp`, `created_at`
- ❌ `visitor_hash` 없음

### visitor_dedup (중복 방지 - 고유 방문자 추적)
- `id`, `site_id`, `visitor_hash`, `last_visit`, `ttl_expiry`
- ✅ `visitor_hash` 있음 (고유 방문자 식별용)

### visitor_sites (사이트별 집계)
- `id`, `domain`, `total_count`, `today_count`, `last_visit_date`

## 해결 방법

### 1. 수정된 SQL 실행

Supabase SQL Editor에서 다음 파일 실행:

```bash
hokex-front/fix-visitor-statistics-function.sql
```

이 파일은:
- ✅ `visitor_dedup` 테이블 사용으로 변경
- ✅ 현재 접속자 수 추가 (최근 5분)
- ✅ 모든 기간별 통계 구현 (오늘, 어제, 7일, 30일, 3개월, 6개월, 1년, 총합)
- ✅ KST 타임존 정확한 처리
- ✅ 사이트가 없을 때 빈 통계 반환

### 2. 실행 방법

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. `fix-visitor-statistics-function.sql` 내용 복사/붙여넣기
4. Run 클릭

### 3. 테스트

SQL Editor에서 실행:

```sql
-- 함수 테스트
SELECT get_visitor_statistics('hokex.xyz');

-- 데이터 확인
SELECT 
  vs.domain,
  COUNT(DISTINCT vd.visitor_hash) as unique_visitors,
  COUNT(*) as total_dedup_records,
  MIN(vd.last_visit) as first_visit,
  MAX(vd.last_visit) as last_visit
FROM visitor_dedup vd
JOIN visitor_sites vs ON vd.site_id = vs.id
GROUP BY vs.domain;
```

## 반환 데이터 구조

수정 후 함수는 다음 JSON 형식으로 반환:

```json
{
  "domain": "hokex.xyz",
  "timestamp": "2026-06-10T12:00:00Z",
  "stats": {
    "current_online": 5,     // 새로 추가! 현재 접속자 (최근 5분)
    "today": 142,
    "yesterday": 98,
    "last_7_days": 856,
    "last_30_days": 3421,
    "last_3_months": 9876,
    "last_6_months": 18543,
    "last_1_year": 34567,
    "total": 45678
  }
}
```

## 프론트엔드 연동

**변경 불필요!** 프론트엔드 코드는 이미 올바르게 구현되어 있습니다:

```typescript
// src/utils/visitorCounter.ts
export async function getDetailedVisitorStatistics(domain: string = DOMAIN) {
  const { data, error } = await supabase
    .rpc('get_visitor_statistics', { p_domain: domain });
  return data;
}
```

```typescript
// src/components/VisitorStatisticsDashboard.tsx
const data = await getDetailedVisitorStatistics();
// data.stats.today, data.stats.yesterday 등 자동 표시
```

## 주의사항

### visitor_dedup 테이블 특성

1. **TTL 기반 만료**: 20분 후 레코드 자동 삭제
2. **최근 데이터만 유지**: 오래된 방문자는 `visitor_dedup`에서 삭제됨
3. **영향**:
   - ✅ "오늘", "어제", "7일" 통계: 정확
   - ⚠️ "30일", "3개월" 이상: TTL로 인해 과소평가 가능

### 장기 통계 개선 방안 (선택적)

만약 30일 이상 통계가 중요하다면:

**옵션 1**: TTL 연장
```sql
-- visitor_dedup TTL을 20분 → 30일로 변경
-- 단, 테이블 크기 증가
```

**옵션 2**: 일별 집계 테이블 추가
```sql
CREATE TABLE visitor_daily_summary (
  date DATE,
  site_id UUID,
  unique_visitors INT,
  PRIMARY KEY (date, site_id)
);
```

## 확인 사항

SQL 실행 후 확인:

- [ ] `get_visitor_statistics('hokex.xyz')` 실행 성공
- [ ] 에러 메시지 없음
- [ ] 관리자 페이지 통계 탭에 숫자 표시
- [ ] "현재 접속" 숫자 표시 (새로 추가됨)
- [ ] 모든 기간별 통계 표시

## 문제 해결

### 여전히 0이 표시되는 경우

1. **데이터 확인**:
```sql
SELECT COUNT(*) FROM visitor_dedup;
SELECT COUNT(*) FROM visitor_sites WHERE domain = 'hokex.xyz';
```

2. **사이트 생성**:
```sql
INSERT INTO visitor_sites (domain, total_count, today_count)
VALUES ('hokex.xyz', 0, 0)
ON CONFLICT (domain) DO NOTHING;
```

3. **Edge Function 확인**: 
- `track-visit` Edge Function이 배포되어 있는지 확인
- 프론트엔드에서 `trackVisit()` 호출되는지 확인

## 관련 파일

- ✅ `fix-visitor-statistics-function.sql` - 수정된 SQL 함수
- `supabase-migrations/setup-visitor-counter.sql` - 원본 테이블 스키마
- `src/utils/visitorCounter.ts` - 프론트엔드 API
- `src/components/VisitorStatisticsDashboard.tsx` - 통계 표시 컴포넌트
- `src/pages/BannerManagementPage.tsx` - 관리자 페이지 (통계 탭)

## 요약

1. **문제**: `visitor_logs.visitor_hash` 컬럼 없음
2. **해결**: `visitor_dedup.visitor_hash` 사용으로 변경
3. **실행**: `fix-visitor-statistics-function.sql` 파일 실행
4. **결과**: 모든 기간별 통계 + 현재 접속자 표시

---

**실행 완료 후 이 체크리스트를 확인하세요:**
- [ ] SQL 실행 완료
- [ ] 에러 없음
- [ ] 관리자 페이지에서 통계 확인
- [ ] 숫자가 0이 아닌 실제 데이터 표시
