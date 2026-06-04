# 🔧 방문자 통계 문제 해결 가이드

**문제**: 방문자 통계가 제대로 안 잡히는 문제  
**작성일**: 2026-06-01

---

## 📊 현재 상황 분석

스크린샷을 보면:
- **현재 접속**: 1명 (정상 작동 중)
- **오늘**: 0명 ❌
- **어제**: 0명 ❌
- **최근 7일**: 5명 (일부 작동)
- **최근 30일**: 12명 (일부 작동)

**문제 원인 추정**:
1. 캐시가 업데이트되지 않음 (30분마다 자동 업데이트 실패)
2. DB에 데이터는 있지만 캐시에 반영 안 됨
3. Edge Function이 실행되지 않음
4. RPC 함수 오류

---

## 🔍 1단계: 문제 진단

### Supabase SQL Editor에서 실행

```sql
-- 진단 스크립트 실행
-- 파일: diagnose-visitor-stats.sql
```

**확인 사항**:
1. `visitor_stats` 테이블에 오늘 데이터가 있는가?
2. `visitor_stats_cache` 테이블의 `updated_at`이 최근인가?
3. `increment_visitor_stat` 함수가 존재하는가?
4. RLS 정책이 올바른가?

---

## 🛠️ 2단계: 문제 해결

### A. 캐시 강제 업데이트 (가장 빠른 해결책)

```sql
-- fix-visitor-stats.sql의 1번 섹션 실행
-- "1. 캐시 강제 업데이트 (수동)"
```

**실행 후 확인**:
- 홈페이지 새로고침
- 방문자 통계 숫자 변경 확인

### B. Edge Function 수동 실행

Supabase Dashboard에서:
1. **Edge Functions** → `update-visitor-stats-cache` 선택
2. **Invoke** 버튼 클릭
3. Request Body:
   ```json
   {
     "type": "full"
   }
   ```
4. **Invoke** 실행

**결과 확인**:
- Response에 `success: true` 확인
- 홈페이지 새로고침

### C. RPC 함수 재생성

```sql
-- fix-visitor-stats.sql의 4번 섹션 실행
-- "4. RPC 함수 재생성"
```

### D. RLS 정책 재설정

```sql
-- fix-visitor-stats.sql의 5번, 6번 섹션 실행
-- "5. RLS 정책 확인 및 재설정"
-- "6. visitor_stats_cache 테이블 RLS 설정"
```

---

## 🔄 3단계: Cron Job 확인

### Supabase Dashboard에서 Cron Job 설정 확인

1. **Database** → **Cron Jobs** 이동
2. 다음 Job이 있는지 확인:

```sql
-- 30분마다 오늘 방문자 수 업데이트
SELECT cron.schedule(
  'update-visitor-cache-today',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"type": "today"}'::jsonb
  );
  $$
);

-- 매일 새벽 4시 전체 통계 업데이트
SELECT cron.schedule(
  'update-visitor-cache-full',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"type": "full"}'::jsonb
  );
  $$
);
```

**없으면 추가**:
- `your-project`를 실제 프로젝트 ID로 변경
- `YOUR_ANON_KEY`를 실제 Anon Key로 변경

---

## 🧪 4단계: 테스트

### 테스트 방문 추가

```sql
-- 오늘 현재 시간에 방문 1회 추가
INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
VALUES (CURRENT_DATE, EXTRACT(HOUR FROM NOW()), 1)
ON CONFLICT (visit_date, visit_hour)
DO UPDATE SET 
  visit_count = visitor_stats.visit_count + 1,
  updated_at = NOW();

-- 캐시 업데이트
-- (fix-visitor-stats.sql의 1번 섹션 실행)

-- 결과 확인
SELECT * FROM visitor_stats_cache WHERE cache_key = 'summary';
```

---

## 📈 5단계: 실시간 모니터링

### 브라우저 콘솔에서 확인

1. 홈페이지 접속
2. F12 → Console 탭
3. 다음 로그 확인:
   ```
   현재 시간: 2026-06-01 14:30
   localStorage last_visit_date: 2026-06-01
   Already visited today, skipping
   ```

**정상 작동 시**:
- 첫 방문: "Recording new visit" 로그
- 재방문: "Already visited today" 로그

**오류 시**:
- "DB 저장 실패" 로그 → RPC 함수 문제
- 로그 없음 → `recordDetailedVisit()` 호출 안 됨

---

## 🚨 일반적인 문제와 해결책

### 문제 1: 오늘 방문 수가 0으로 표시

**원인**: 캐시가 업데이트되지 않음

**해결**:
```sql
-- 캐시 강제 업데이트
-- (fix-visitor-stats.sql의 1번 섹션)
```

### 문제 2: DB에 데이터는 있지만 화면에 안 보임

**원인**: 캐시와 DB 불일치

**해결**:
1. 캐시 강제 업데이트
2. Edge Function 수동 실행

### 문제 3: 방문해도 카운트가 안 올라감

**원인**: RPC 함수 오류 또는 RLS 정책 문제

**해결**:
1. RPC 함수 재생성
2. RLS 정책 재설정
3. 브라우저 콘솔에서 에러 확인

### 문제 4: 중복 카운트

**원인**: 같은 날짜/시간에 여러 레코드

**해결**:
```sql
-- 중복 데이터 제거
-- (fix-visitor-stats.sql의 3번 섹션 주석 해제 후 실행)
```

---

## 🔧 빠른 해결 체크리스트

1. ✅ **캐시 강제 업데이트** (가장 먼저 시도)
   ```sql
   -- fix-visitor-stats.sql의 1번 섹션
   ```

2. ✅ **Edge Function 수동 실행**
   - Dashboard → Edge Functions → Invoke

3. ✅ **Cron Job 확인**
   - Database → Cron Jobs

4. ✅ **RPC 함수 확인**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'increment_visitor_stat';
   ```

5. ✅ **RLS 정책 확인**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'visitor_stats';
   ```

---

## 📞 추가 지원

### Supabase Dashboard에서 확인할 것

1. **Database** → **Tables** → `visitor_stats`
   - 오늘 날짜 데이터 있는지 확인

2. **Database** → **Tables** → `visitor_stats_cache`
   - `updated_at` 시간 확인 (30분 이내여야 함)

3. **Edge Functions** → `update-visitor-stats-cache`
   - Logs 탭에서 에러 확인

4. **Database** → **Cron Jobs**
   - Job 실행 이력 확인

---

## 🎯 예상 결과

**정상 작동 시**:
- 오늘 방문 수: 실시간 반영 (30분 지연 가능)
- 어제 방문 수: 새벽 4시 업데이트
- 최근 7일/30일: 새벽 4시 업데이트

**캐시 업데이트 주기**:
- 오늘: 30분마다
- 나머지: 매일 새벽 4시

---

## 📝 로그 확인 방법

### 1. 브라우저 콘솔 (프론트엔드)
```javascript
// F12 → Console
// detailedAnalytics.ts의 showDebugInfo() 로그 확인
```

### 2. Supabase Edge Function 로그
```
Dashboard → Edge Functions → update-visitor-stats-cache → Logs
```

### 3. DB 쿼리 로그
```sql
-- 최근 1시간 데이터 확인
SELECT * FROM visitor_stats 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## ✅ 최종 확인

모든 수정 후:

1. **홈페이지 새로고침** (Ctrl + Shift + R)
2. **방문자 통계 확인**
3. **브라우저 콘솔 확인** (에러 없는지)
4. **10분 후 다시 확인** (캐시 업데이트 대기)

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-06-01  
**관련 파일**:
- `diagnose-visitor-stats.sql` (진단)
- `fix-visitor-stats.sql` (수정)
- `src/utils/detailedAnalytics.ts` (프론트엔드)
- `supabase/functions/update-visitor-stats-cache/index.ts` (Edge Function)
