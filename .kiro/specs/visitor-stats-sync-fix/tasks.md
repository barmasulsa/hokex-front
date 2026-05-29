# Visitor Stats Synchronization - Tasks

## ✅ Task 1: 테이블 생성 및 초기화
**Status**: Completed

### 작업 내용
- [x] `visitor_stats` 테이블 생성
- [x] `visitor_stats_cache` 테이블 생성 (DROP CASCADE)
- [x] 초기 캐시 레코드 삽입

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 1)

---

## ✅ Task 2: 비즈니스 날짜 계산 함수
**Status**: Completed

### 작업 내용
- [x] `get_business_date()` 함수 생성
- [x] 새벽 4시 기준 날짜 계산 로직
- [x] KST 타임존 처리

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 2)

### 함수 시그니처
```sql
get_business_date(ts TIMESTAMPTZ DEFAULT NOW()) RETURNS DATE
```

---

## ✅ Task 3: 캐시 업데이트 함수
**Status**: Completed

### 작업 내용
- [x] 기존 함수 안전하게 삭제 (CASCADE)
- [x] `update_visitor_stats_cache()` 함수 생성
- [x] TABLE 반환 타입으로 변경
- [x] 오늘/어제/7일/30일 집계 계산

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 3)

### 함수 시그니처
```sql
update_visitor_stats_cache() 
RETURNS TABLE(
  today INTEGER,
  yesterday INTEGER,
  last_7_days INTEGER,
  last_30_days INTEGER,
  business_date DATE
)
```

---

## ✅ Task 4: 자동 트리거 설정
**Status**: Completed

### 작업 내용
- [x] `trigger_update_visitor_cache()` 함수 생성
- [x] `auto_update_visitor_cache` 트리거 생성
- [x] STATEMENT 레벨 트리거 설정

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 4)

---

## ✅ Task 5: pg_cron 스케줄러 설정
**Status**: Completed

### 작업 내용
- [x] 기존 스케줄 안전하게 삭제 (DO $$ EXCEPTION)
- [x] 1분 간격 스케줄 등록
- [x] 에러 처리 추가

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 5)

### 에러 수정 내역
1. **반환 타입 변경 에러**: `DROP FUNCTION ... CASCADE` 추가
2. **스케줄 삭제 에러**: `DO $$ ... EXCEPTION` 블록 추가

---

## ✅ Task 6: RPC 함수 생성
**Status**: Completed

### 작업 내용
- [x] `increment_visitor_stat()` 함수 생성
- [x] UPSERT 로직 구현

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 6)

---

## ✅ Task 7: RLS 정책 설정
**Status**: Completed

### 작업 내용
- [x] `visitor_stats` 테이블 RLS 활성화
- [x] `visitor_stats_cache` 테이블 RLS 활성화
- [x] Public SELECT 정책
- [x] Service Role 전체 권한 정책

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 7)

---

## ✅ Task 8: 초기 캐시 업데이트 및 검증
**Status**: Completed

### 작업 내용
- [x] 캐시 강제 업데이트 실행
- [x] 현재 시간/날짜 확인 쿼리
- [x] 캐시 내용 확인 쿼리
- [x] 원본 데이터 확인 쿼리

### 구현 파일
- `VISITOR_STATS_COMPLETE_SETUP.sql` (STEP 8)

---

## 배포 가이드

### 1. Supabase SQL Editor 접속
1. Supabase 대시보드 로그인
2. SQL Editor 메뉴 선택

### 2. SQL 스크립트 실행
1. `VISITOR_STATS_COMPLETE_SETUP.sql` 파일 열기
2. 전체 내용 복사
3. SQL Editor에 붙여넣기
4. Run 버튼 클릭

### 3. 실행 결과 확인
```sql
-- 캐시 확인
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';

-- 원본 데이터 확인 (최근 3일)
SELECT 
  visit_date,
  SUM(visit_count) as total_visits
FROM visitor_stats
WHERE visit_date >= get_business_date(NOW()) - INTERVAL '2 days'
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 스케줄 확인
SELECT * FROM cron.job WHERE jobname = 'update-visitor-stats-cache';
```

### 4. 프론트엔드 확인
1. 관리자 페이지 방문자 통계 확인
2. 홈페이지 방문자 통계 확인
3. 두 페이지의 숫자가 일치하는지 확인

---

## 트러블슈팅

### 에러 1: 함수 반환 타입 변경 불가
```
ERROR: 42P13: cannot change return type of existing function
```
**해결**: `DROP FUNCTION IF EXISTS ... CASCADE` 추가

### 에러 2: 스케줄 삭제 실패
```
ERROR: XX000: could not find valid entry for job
```
**해결**: `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL` 블록 사용

---

## 검증 체크리스트

- [x] SQL 스크립트 에러 없이 실행
- [x] 테이블 생성 확인
- [x] 함수 생성 확인
- [x] 트리거 생성 확인
- [x] pg_cron 스케줄 등록 확인
- [x] RLS 정책 적용 확인
- [x] 캐시 데이터 확인
- [ ] 관리자 페이지 통계 확인
- [ ] 홈페이지 통계 확인
- [ ] 통계 일치 확인
