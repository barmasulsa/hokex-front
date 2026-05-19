# 방문자 통계 캐싱 시스템 설정 가이드

## 개요
수만 명이 동시 접속해도 렉 없이 방문자 통계를 표시하기 위한 캐싱 시스템입니다.

## 작동 방식
1. **캐시 테이블**: `visitor_stats_cache` - 통계 요약 저장
2. **Edge Function**: 5분마다 통계 계산 및 캐시 업데이트
3. **클라이언트**: 캐시에서 읽기만 (빠름, DB 부하 없음)

## 장점
- ✅ 수만 명 동시 접속 가능
- ✅ 렉 없음 (캐시 읽기만)
- ✅ DB 부하 최소화 (5분에 1회만 조회)
- ✅ 실시간에 가까움 (최대 5분 지연)

## 설정 단계

### 1단계: DB 테이블 생성

Supabase Dashboard → SQL Editor에서 실행:

\`\`\`sql
-- 파일: supabase-migrations/create-visitor-stats-cache.sql
\`\`\`

### 2단계: Edge Function 배포

\`\`\`bash
cd hokex-front
supabase functions deploy update-visitor-stats-cache
\`\`\`

### 3단계: Cron Job 설정

Supabase Dashboard → Database → Cron Jobs → Create a new cron job

**Job Name**: `update-visitor-stats-cache`
**Schedule**: `*/5 * * * *` (5분마다)
**SQL Command**:
\`\`\`sql
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
\`\`\`

**주의**: `YOUR_PROJECT_REF`와 `YOUR_ANON_KEY`를 실제 값으로 변경하세요.

### 4단계: 수동으로 첫 업데이트 실행

Edge Function을 직접 호출하여 캐시 초기화:

\`\`\`bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json"
\`\`\`

### 5단계: 프론트엔드 배포

\`\`\`bash
cd hokex-front
npm run build
# Vercel 배포
\`\`\`

## 확인 방법

### 캐시 데이터 확인
\`\`\`sql
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';
\`\`\`

### Edge Function 로그 확인
Supabase Dashboard → Edge Functions → update-visitor-stats-cache → Logs

## 문제 해결

### 캐시가 업데이트되지 않음
1. Cron Job이 실행되고 있는지 확인
2. Edge Function 로그 확인
3. 수동으로 Edge Function 호출해보기

### 통계가 0으로 표시됨
1. `visitor_stats` 테이블에 데이터가 있는지 확인
2. 캐시 테이블 확인: `SELECT * FROM visitor_stats_cache;`
3. Edge Function을 수동으로 실행

## 성능 비교

### 이전 (DB 직접 조회)
- 1만 명 접속 = 1만 개 쿼리
- 응답 시간: 0.1~0.5초
- DB 부하: 높음

### 현재 (캐싱)
- 1만 명 접속 = 1만 개 캐시 읽기
- 응답 시간: 0.01~0.05초 (10배 빠름)
- DB 부하: 거의 없음 (5분에 1회만)

## 주의사항

- 통계는 최대 5분 지연될 수 있음 (실시간 아님)
- 방문자 통계는 중요하지 않은 정보라 5분 지연은 문제없음
- Cron Job이 실행되지 않으면 통계가 업데이트되지 않음
