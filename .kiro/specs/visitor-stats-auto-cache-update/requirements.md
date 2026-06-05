# Visitor Stats Auto Cache Update - Requirements

## 개요
방문객 통계 캐시(`visitor_stats_cache`)가 자동으로 업데이트되지 않아 오늘 방문객 수가 0으로 표시되는 문제를 해결하기 위한 자동 캐시 업데이트 시스템 구축

## 문제 상황

### 증상
- `visitor_stats_cache` 테이블의 오늘(2026-06-04) 방문객 수가 0으로 표시
- `visitor_stats` 테이블에는 실제 방문 데이터 존재 (1명)
- 수동 SQL 쿼리 실행 시 정상 업데이트됨

### 근본 원인
- 자동 캐시 업데이트 메커니즘 미설정
- Supabase Free Tier는 `pg_cron` 미지원 → DB 레벨 스케줄링 불가능

## 요구사항

### FR-1: 자동 캐시 업데이트
- 30분마다 `visitor_stats_cache` 테이블을 자동 업데이트해야 함
- KST 타임존(Asia/Seoul, UTC+9) 기준으로 날짜 계산
- Supabase Free Tier 제약 조건 내에서 작동

### FR-2: GitHub Actions 스케줄러 사용
- Supabase Pro 없이도 자동 업데이트 제공
- GitHub Actions의 `schedule` 기능 활용
- 기존 Edge Function 호출 방식 유지

### FR-3: Edge Function 호출
- `update-visitor-stats-cache` Edge Function을 HTTP로 호출
- `SUPABASE_ANON_KEY` 인증 사용
- 성공/실패 로깅

### FR-4: 수동 실행 지원
- GitHub Actions UI에서 수동 실행 가능
- 디버깅 및 즉시 업데이트 시 활용

## 비기능 요구사항

### NFR-1: 신뢰성
- 네트워크 오류 시 자동 재시도
- 실패 로그 기록

### NFR-2: 성능
- Edge Function 실행 시간 < 10초
- 캐시 업데이트 완료 시간 < 5초

### NFR-3: 유지보수성
- 워크플로우 설정 파일로 관리
- GitHub Secrets로 민감 정보 보호

## 제약사항

### C-1: Supabase Free Tier
- `pg_cron` 확장 기능 사용 불가
- Edge Function은 사용 가능

### C-2: GitHub Actions
- 공용 저장소에서 무료 사용
- 스케줄 간격 최소 5분 (실제로는 더 긴 간격 권장)

### C-3: 타임존
- 모든 날짜 계산은 KST(UTC+9) 기준
- Edge Function 내에서 타임존 처리

## 데이터 구조

### visitor_stats (원본 데이터)
```sql
- visit_date: DATE (KST 기준)
- visit_hour: INTEGER (0-23)
- visit_count: INTEGER
- created_at: TIMESTAMP
```

### visitor_stats_cache (집계 캐시)
```sql
- cache_key: TEXT (PRIMARY KEY, 'summary')
- today: INTEGER (오늘 방문자 수)
- yesterday: INTEGER (어제 방문자 수)
- last_7_days: INTEGER (최근 7일 방문자 수)
- last_30_days: INTEGER (최근 30일 방문자 수)
- total_visits: INTEGER (전체 방문자 수)
- updated_at: TIMESTAMP
```

## 성공 기준

### SC-1: 자동 업데이트 정상 작동
- 30분마다 GitHub Actions 워크플로우 자동 실행
- Edge Function 호출 성공 (HTTP 200)
- 캐시 테이블 정상 업데이트 확인

### SC-2: 실시간 데이터 반영
- 새로운 방문이 발생하면 최대 30분 내 캐시에 반영
- 프론트엔드에서 최신 데이터 확인 가능

### SC-3: 안정성
- 24시간 연속 실행 시 오류율 < 1%
- 실패 시 다음 스케줄에서 자동 복구

## 우선순위

1. **P0 (Critical)**: GitHub Actions 스케줄 설정
2. **P0 (Critical)**: Edge Function 호출 및 인증
3. **P1 (High)**: 수동 실행 지원
4. **P2 (Medium)**: 오류 처리 및 로깅
5. **P3 (Low)**: 성능 최적화

## 참고 자료

- GitHub Actions 워크플로우: `.github/workflows/update-visitor-cache-debug.yml`
- Edge Function: `supabase/functions/update-visitor-stats-cache/index.ts`
- 캐시 테이블 스키마: `supabase-migrations/create-visitor-stats-cache.sql`
- 진단 SQL: `CHECK_VISITOR_DATA_TODAY.sql`
