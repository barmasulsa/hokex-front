# 방문자 통계 0명 문제 진단 가이드

## 📋 현재 상황
- ✅ RPC 함수 `increment_visitor_stat` 존재 확인됨
- ✅ 프론트엔드 코드에서 함수 호출 코드 있음
- ❌ 오늘/어제 방문자 수 = 0명
- ✅ 총 레코드 수 = 29,835개 (과거 데이터 존재)

## 🔍 진단 절차

### 1단계: 함수 상세 진단 실행
```bash
Supabase SQL Editor에서 실행:
DIAGNOSE_FUNCTION_AND_RLS.sql
```

**확인 사항:**
- [ ] 함수가 `SECURITY DEFINER`인가?
- [ ] `anon`, `authenticated` 권한 있나?
- [ ] RLS 정책에 `service_role` INSERT/UPDATE 권한 있나?
- [ ] 테스트 INSERT가 성공하나?

### 2단계: 브라우저 콘솔 확인
1. Vercel 배포된 사이트 접속: https://hokex.vercel.app
2. F12 → Console 탭 열기
3. 페이지 새로고침
4. 콘솔에서 다음 메시지 확인:

**정상일 때:**
```
🔵 [방문통계] DB RPC 호출: increment_visitor_stat
✅ [방문통계] DB 저장 성공!
```

**에러일 때:**
```
❌ [방문통계] DB RPC 실패: [에러 메시지]
에러 코드: [코드]
```

### 3단계: 수동 함수 호출 테스트
```sql
-- Supabase SQL Editor에서 실행
SELECT increment_visitor_stat(CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER);

-- 결과 확인
SELECT * FROM visitor_stats 
WHERE visit_date = CURRENT_DATE 
ORDER BY visit_hour DESC 
LIMIT 3;
```

### 4단계: 최근 데이터 추세 확인
```sql
-- 최근 7일간 일별 방문 수
SELECT 
  visit_date,
  SUM(visit_count) as daily_total
FROM visitor_stats
WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visit_date
ORDER BY visit_date DESC;
```

**예상 결과:**
- 과거 날짜에만 데이터 있고 최근(오늘/어제)에 데이터 없으면 → **최근 데이터 수집 중단**
- 모든 날짜에 데이터 없으면 → **수집 자체가 안 됨**

## 🎯 가능한 원인 및 해결방법

### 원인 1: RLS 정책 문제
**증상:** 
- 1단계에서 직접 INSERT는 성공
- 함수 호출은 실패
- RLS 정책에 `service_role` 권한 없음

**해결:**
```sql
-- RLS 정책 삭제 및 재생성
-- fix-visitor-tracking-complete.sql 의 2단계 실행
```

### 원인 2: 함수 권한 문제
**증상:**
- 1단계에서 함수가 `SECURITY INVOKER`로 되어 있음
- 또는 `anon` 권한 없음

**해결:**
```sql
-- 함수 재생성
-- fix-visitor-tracking-complete.sql 의 1단계 실행

-- 권한 부여
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;
```

### 원인 3: 프론트엔드 호출 실패 (에러 무시됨)
**증상:**
- 2단계에서 콘솔에 에러 메시지 출력됨
- 함수는 정상이지만 호출 시 에러

**해결:**
- 콘솔 에러 메시지 확인 후 해당 오류에 맞는 조치

### 원인 4: 환경변수 또는 Supabase 연결 문제
**증상:**
- 2단계에서 아무 메시지도 안 나옴
- 또는 "Supabase client not initialized" 같은 에러

**해결:**
```bash
# .env 파일 확인
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Vercel 환경변수 확인
```

### 원인 5: 최근 배포에서 코드 변경됨
**증상:**
- Git에는 코드 있는데 배포된 사이트에 없음

**해결:**
```bash
# 최신 코드 재배포
git push origin main
# Vercel에서 자동 재배포됨
```

## 🚀 빠른 수정 (All-in-One)

모든 원인을 한 번에 해결:

```sql
-- Supabase SQL Editor에서 실행
-- fix-visitor-tracking-complete.sql 전체 실행
```

이 스크립트는:
1. ✅ 함수를 SECURITY DEFINER로 재생성
2. ✅ 모든 권한 부여
3. ✅ RLS 정책 재설정
4. ✅ 테스트 데이터 삽입
5. ✅ 캐시 강제 업데이트

## 📊 수정 후 확인

```sql
-- 오늘 데이터 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour DESC;

-- 캐시 확인
SELECT 
  today,
  yesterday,
  updated_at
FROM visitor_stats_cache
WHERE cache_key = 'summary';
```

## 💡 디버깅 팁

1. **실시간 모니터링:**
   - 브라우저 콘솔 계속 열어두기
   - 페이지 새로고침할 때마다 로그 확인

2. **Supabase 로그 확인:**
   - Supabase Dashboard → Logs → Functions
   - RPC 호출 실패 로그 확인

3. **타임존 문제:**
   - 서버 시간 vs 로컬 시간 차이 확인
   - `SELECT NOW(), CURRENT_DATE, EXTRACT(HOUR FROM NOW());`

## 📝 결과 보고 양식

진단 후 다음 정보 제공:

```
1단계 결과:
- SECURITY 모드: [DEFINER / INVOKER]
- 권한: [있음 / 없음]
- 테스트 INSERT: [성공 / 실패]

2단계 결과:
- 콘솔 메시지: [메시지 복사]

3단계 결과:
- 수동 호출: [성공 / 실패]
- 데이터 삽입됨: [예 / 아니오]

4단계 결과:
- 최근 7일 데이터: [있음 / 없음]
- 언제까지 있나: [날짜]
```
