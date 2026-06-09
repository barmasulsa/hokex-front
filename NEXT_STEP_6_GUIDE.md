# 🎯 다음 단계: STEP 6 실행 가이드

## 📊 현재 진행 상황

| STEP | 작업 | 상태 |
|------|------|------|
| STEP 1 | 기존 시스템 백업 | ✅ 완료 |
| STEP 2 | 기존 시스템 제거 | ✅ 완료 |
| STEP 3 | 새 시스템 설치 | ✅ 완료 |
| STEP 4 | Edge Function 배포 | ✅ 완료 |
| STEP 5 | 프론트엔드 코드 수정 | ✅ 완료 |
| **STEP 6** | **Cron Jobs 설정** | ⏳ **진행 필요** |

---

## 🚀 STEP 6 실행 방법

### 1. Supabase 대시보드 접속

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `qmhxnxnaawtjelqlgyig`
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2. SQL 파일 실행

다음 파일의 **전체 내용**을 복사해서 SQL Editor에 붙여넣고 실행:

```
hokex-front/execute-step-4-5-6.sql
```

### 3. 실행 내용

이 SQL 파일은 다음을 수행합니다:

#### ✅ Cron Job 1: 만료된 중복 방지 레코드 정리
```sql
-- 1시간마다 실행 (매시 정각)
-- 20분 TTL 만료된 visitor_dedup 레코드 삭제
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 * * * *',
  $$SELECT clean_expired_dedup_records();$$
);
```

#### ✅ Cron Job 2: 매일 자정 today_count 리셋
```sql
-- 매일 자정(KST) 실행 (UTC 15:00 = KST 00:00)
-- visitor_sites의 today_count를 0으로 리셋
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',
  $$SELECT reset_daily_visitor_counts();$$
);
```

#### ✅ 검증 쿼리
```sql
-- 1. 테이블 존재 확인
-- 2. 함수 존재 확인
-- 3. Cron 작업 확인
```

---

## 📋 SQL 파일 내용 미리보기

```sql
-- ========================================
-- STEP 6: Cron Jobs 설정
-- ========================================

-- 1. 만료된 중복 방지 레코드 정리 (1시간마다)
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 * * * *',  -- 매시 정각
  $$SELECT clean_expired_dedup_records();$$
);

-- 2. 매일 자정 today_count 리셋
SELECT cron.schedule(
  'reset-daily-visitor-counts',
  '0 15 * * *',  -- UTC 15:00 = KST 00:00
  $$SELECT reset_daily_visitor_counts();$$
);

-- ========================================
-- 검증: 시스템 상태 확인
-- ========================================

-- 1. 테이블 확인
SELECT 'visitor_sites' as table_name, COUNT(*) as records FROM visitor_sites
UNION ALL
SELECT 'visitor_logs', COUNT(*) FROM visitor_logs
UNION ALL
SELECT 'visitor_dedup', COUNT(*) FROM visitor_dedup;

-- 2. 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%visitor%';

-- 3. Cron 작업 확인
SELECT jobname, active, schedule 
FROM cron.job 
WHERE jobname LIKE '%visitor%';
```

---

## ✅ 성공 확인 방법

SQL 실행 후 다음 결과가 나와야 합니다:

### 1. Cron 작업 생성 확인

```
| jobname                      | active | schedule    |
|------------------------------|--------|-------------|
| cleanup-visitor-dedup        | true   | 0 * * * *   |
| reset-daily-visitor-counts   | true   | 0 15 * * *  |
```

### 2. 테이블 확인

```
| table_name     | records |
|----------------|---------|
| visitor_sites  | 1       |
| visitor_logs   | N       |
| visitor_dedup  | N       |
```

### 3. 함수 확인

```
| routine_name                    |
|---------------------------------|
| clean_expired_dedup_records     |
| reset_daily_visitor_counts      |
```

---

## 🔧 Cron Job 동작 확인

### 1. 즉시 실행 테스트

```sql
-- 만료 레코드 정리 즉시 실행
SELECT clean_expired_dedup_records();

-- 결과: 정리된 레코드 수 반환
-- "Cleaned N expired dedup records"
```

```sql
-- 자정 리셋 즉시 실행 (테스트용)
SELECT reset_daily_visitor_counts();

-- 결과: 리셋된 사이트 수 반환
-- "Reset today_count for N sites"
```

### 2. Cron 실행 로그 확인

```sql
-- pg_cron 확장이 설치되어 있는지 확인
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Cron 작업 상태 확인
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname LIKE '%visitor%'
)
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🎉 마이그레이션 완료!

STEP 6가 완료되면 **모든 마이그레이션이 완료**됩니다!

### 최종 체크리스트

- [✅] STEP 1: 기존 시스템 백업
- [✅] STEP 2: 기존 시스템 제거
- [✅] STEP 3: 새 시스템 설치
- [✅] STEP 4: Edge Function 배포
- [✅] STEP 5: 프론트엔드 코드 수정
- [ ] **STEP 6: Cron Jobs 설정 ← 지금 실행**

---

## 📊 시스템 구조 (완료 후)

```
┌─────────────────────┐
│   hokex.xyz 접속    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  trackVisit() 호출  │  (App.tsx)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Edge Function       │  (track-visit)
│ - IP + UA 해시      │
│ - 20분 TTL 체크     │
│ - 카운트 증가       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Supabase Tables                     │
│ ┌─────────────────────────────────┐ │
│ │ visitor_sites (도메인별 통계)   │ │
│ │ - total_count                   │ │
│ │ - today_count ← 자정 리셋       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ visitor_logs (방문 로그)        │ │
│ │ - visitor_ip                    │ │
│ │ - user_agent                    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ visitor_dedup (중복 방지)       │ │
│ │ - visitor_hash                  │ │
│ │ - ttl_expiry ← 1시간마다 정리   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
           ▲
           │
    ┌──────┴──────┐
    │             │
┌───┴────┐  ┌─────┴──────┐
│ Cron 1 │  │   Cron 2   │
│ 1시간  │  │ 매일 자정  │
│ 정리   │  │ 리셋       │
└────────┘  └────────────┘
```

---

## 🆘 도움말

### Q: Cron 작업이 생성되지 않으면?

```sql
-- pg_cron 확장 설치 확인
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 없으면 설치 (슈퍼유저 권한 필요)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Q: 함수가 없다고 나오면?

STEP 3 (`setup-visitor-counter.sql`)을 다시 실행하세요.

### Q: 테이블이 없다고 나오면?

STEP 3 (`setup-visitor-counter.sql`)을 다시 실행하세요.

---

**준비 완료! 이제 Supabase SQL Editor에서 `execute-step-4-5-6.sql`을 실행하세요.** 🚀
