# 방문자 통계 로직 수정 가이드

## 문제 상황
- **증상**: 관리자 페이지의 날짜별/시간대별 방문자가 중복 카운트됨
- **예시**: 1명만 방문했는데 32명으로 표시됨
- **원인**: `visitor_logs` 테이블에서 전체 로그를 카운트하여 고유 방문자가 아닌 중복 방문 포함

## 해결 방법
`ip_address`와 `user_agent`의 조합으로 고유 방문자를 식별하도록 수정

## 배포 순서

### 1단계: 테이블 스키마 확인
먼저 `visitor_logs` 테이블의 실제 구조를 확인합니다:

```sql
-- Supabase Dashboard > SQL Editor에서 실행
-- check-visitor-logs-columns.sql 파일 내용 실행
```

### 2단계: SQL 함수 적용
`fix-visitor-stats-logic-corrected.sql` 파일을 Supabase에 적용합니다:

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. `fix-visitor-stats-logic-corrected.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭

### 3단계: 함수 동작 확인
SQL Editor에서 다음 쿼리로 확인:

```sql
-- 오늘 고유 방문자 수 (정상적으로 1명으로 나와야 함)
SELECT 
  '오늘 고유 방문자' as label,
  COUNT(DISTINCT (vl.ip_address || '|' || COALESCE(vl.user_agent, ''))) as count
FROM visitor_logs vl
JOIN visitor_sites vs ON vl.site_id = vs.id
WHERE vs.domain = 'hokex.xyz'
  AND vl.created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

-- 시간대별 통계 확인
SELECT * FROM get_hourly_unique_visitors('hokex.xyz') ORDER BY hour;

-- 날짜별 통계 확인
SELECT * FROM get_daily_unique_visitors('hokex.xyz', 7) ORDER BY date;

-- 전체 통계 확인
SELECT get_visitor_statistics('hokex.xyz');
```

### 4단계: 프론트엔드 확인
프론트엔드는 이미 수정되어 있습니다 (`src/utils/visitorCounter.ts`):
- `getHourlyVisitorStats()` → `get_hourly_unique_visitors` RPC 호출
- `getDailyVisitorStats()` → `get_daily_unique_visitors` RPC 호출
- `getDetailedVisitorStatistics()` → `get_visitor_statistics` RPC 호출

### 5단계: 관리자 페이지에서 확인
1. 관리자 로그인
2. 방문자 통계 대시보드 접속
3. "날짜별 방문자" 섹션에서 오늘 방문자 수 확인
4. "시간대별 방문자" 섹션에서 시간대별 통계 확인
5. "기간별 방문자 통계" 섹션에서 전체 통계 확인

## 주요 변경 사항

### SQL 함수 변경
**기존**: `COUNT(DISTINCT fingerprint)` (존재하지 않는 컬럼)
**수정**: `COUNT(DISTINCT (ip_address || '|' || COALESCE(user_agent, '')))` (실제 컬럼 조합)

### 고유 방문자 식별 방법
- `ip_address` + `user_agent`의 조합으로 고유 방문자 식별
- 같은 IP라도 다른 브라우저면 다른 방문자로 카운트
- 같은 IP, 같은 브라우저의 반복 방문은 1명으로 카운트

## 롤백 방법
문제가 발생하면 다음 명령으로 함수 삭제:

```sql
DROP FUNCTION IF EXISTS get_hourly_unique_visitors(text);
DROP FUNCTION IF EXISTS get_daily_unique_visitors(text, int);
DROP FUNCTION IF EXISTS get_visitor_statistics(text);
```

## 예상 결과
- **수정 전**: 오늘 방문자 32명 (중복 포함)
- **수정 후**: 오늘 방문자 1명 (고유 방문자만)

## 참고 사항
- 이 수정은 기존 데이터에 영향을 주지 않습니다
- 함수만 수정하므로 안전하게 적용 가능
- RLS 정책도 함께 업데이트되어 관리자만 접근 가능
