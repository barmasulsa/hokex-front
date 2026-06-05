# 방문자 0명 문제 진단 및 해결 가이드

## 🚨 현재 상황
- **개발 서버**: 오늘/어제 방문자 0명
- **프로덕션**: 오늘/어제 방문자 0명

## 📋 진단 순서

### 1단계: DB 데이터 확인
Supabase SQL Editor에서 아래 SQL을 실행하세요:

```sql
-- 파일: URGENT_DIAGNOSE.sql
```

실행 후 다음 항목을 확인하세요:

#### ✅ 체크리스트

**A. visitor_stats 테이블에 데이터가 있나요?**
- ❌ 총 레코드 수 = 0 → **문제: 프론트엔드에서 트래킹이 작동하지 않음**
  - 해결: [2단계: 프론트엔드 트래킹 확인](#2단계-프론트엔드-트래킹-확인)으로 이동
  
- ✅ 총 레코드 수 > 0 → **B로 계속**

**B. 오늘/어제 데이터가 있나요?**
- ❌ 오늘_방문자 = 0, 어제_방문자 = 0 → **문제: 최근 데이터가 없음**
  - 해결: [3단계: 날짜 확인](#3단계-날짜-확인)으로 이동
  
- ✅ 방문자 수 > 0 → **C로 계속**

**C. RPC 함수가 존재하나요?**
- ❌ `increment_visitor_stat` 함수가 없음 → **문제: DB 마이그레이션 누락**
  - 해결: [4단계: RPC 함수 생성](#4단계-rpc-함수-생성)으로 이동
  
- ✅ 함수 존재 → **D로 계속**

**D. 캐시 테이블에 데이터가 있나요?**
- ❌ `visitor_stats_cache` 테이블이 비어있음 → **문제: 캐시가 업데이트되지 않음**
  - 해결: [5단계: 캐시 수동 업데이트](#5단계-캐시-수동-업데이트)로 이동
  
- ✅ 캐시에 데이터 있음 → **문제: 프론트엔드 버그일 가능성**
  - 해결: [6단계: 프론트엔드 캐시 확인](#6단계-프론트엔드-캐시-확인)으로 이동

---

## 🔧 해결 방법

### 2단계: 프론트엔드 트래킹 확인

visitor_stats 테이블이 비어있다면, 프론트엔드에서 트래킹이 작동하지 않는 것입니다.

**확인 방법:**
1. 브라우저 콘솔(F12)을 열고 홈페이지에 접속
2. 다음 로그가 보이는지 확인:
   ```
   [HomePage] Recording visit...
   현재 시간: 2026-06-04 14:30시
   localStorage last_visit_date: 2026-06-03
   ✅ Recording new visit for 2026-06-04 14시
   localStorage 저장 완료
   DB 저장 시작...
   ✅ DB 저장 성공!
   ```

**에러가 보이는 경우:**
- `❌ DB RPC 실패: ...` → RPC 함수 문제
- `❌ DB 저장 예외: ...` → 권한 문제

**아무 로그도 안 보이는 경우:**
- `recordDetailedVisit()` 함수가 호출되지 않음
- 코드 배포 문제일 수 있음

**해결:**
```bash
# 프론트엔드 재배포
cd hokex-front
npm run build
# Vercel에 자동 배포됨
```

---

### 3단계: 날짜 확인

데이터가 있지만 오늘/어제가 0이라면, 날짜 계산 문제일 수 있습니다.

**확인:**
진단 SQL의 "현재 시각 비교" 섹션에서:
- UTC시각과 KST시각이 9시간 차이가 나나요?
- KST날짜가 올바른가요?

**문제가 있다면:**
이미 Edge Function은 KST를 사용하도록 수정되어 배포되었습니다.
캐시를 수동으로 업데이트하면 해결됩니다.

→ [5단계: 캐시 수동 업데이트](#5단계-캐시-수동-업데이트)로 이동

---

### 4단계: RPC 함수 생성

`increment_visitor_stat` 함수가 없다면 생성해야 합니다.

**Supabase SQL Editor에서 실행:**

```sql
-- increment_visitor_stat 함수 생성
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (p_visit_date, p_visit_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;
```

**실행 후 다시 진단 SQL을 실행하여 확인하세요.**

---

### 5단계: 캐시 수동 업데이트

데이터는 있지만 캐시가 비어있다면, 캐시를 수동으로 업데이트하세요.

**Supabase SQL Editor에서 실행:**

```bash
# 파일 열기
c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front\force-update-visitor-cache-now.sql
```

이 SQL을 복사하여 Supabase SQL Editor에서 실행하세요.

**실행 결과:**
```
=== 현재 시각 (KST): 2026-06-04 14:30:00 ===
오늘 날짜 (KST): 2026-06-04
어제 날짜 (KST): 2026-06-03

✓ 오늘 (2026-06-04) 방문자: 5명
✓ 어제 (2026-06-03) 방문자: 12명
...
✅ 캐시 업데이트 완료!
```

**캐시 업데이트 후:**
1. 개발 서버를 새로고침 (Ctrl+Shift+R)
2. 방문자 통계가 표시되는지 확인
3. 프로덕션도 새로고침하여 확인

**여전히 0명이라면:**
→ [6단계: 프론트엔드 캐시 확인](#6단계-프론트엔드-캐시-확인)으로 이동

---

### 6단계: 프론트엔드 캐시 확인

캐시에 데이터가 있는데도 프론트엔드에서 0명으로 보인다면:

**브라우저 콘솔에서 직접 확인:**

```javascript
// 1. Supabase 클라이언트로 직접 조회
const { data, error } = await window.supabase
  .from('visitor_stats_cache')
  .select('*')
  .eq('cache_key', 'summary')
  .single();

console.log('캐시 데이터:', data);
console.log('에러:', error);
```

**결과 분석:**
- `data`가 null이고 `error`가 있음 → RLS 정책 문제
- `data`가 있고 값이 0이 아님 → 프론트엔드 렌더링 버그
- `data`가 있고 값이 0 → 5단계로 돌아가서 캐시 재업데이트

**RLS 정책 문제 해결:**

```sql
-- visitor_stats_cache 테이블에 SELECT 권한 부여
DROP POLICY IF EXISTS "Allow public read access to visitor_stats_cache" ON visitor_stats_cache;

CREATE POLICY "Allow public read access to visitor_stats_cache"
ON visitor_stats_cache
FOR SELECT
TO anon, authenticated
USING (true);
```

---

## 🎯 가장 가능성 높은 원인

현재 상황(로컬/프로덕션 모두 0명)을 고려하면:

### 원인 1: visitor_stats 테이블이 비어있음 (70% 확률)
- **증상**: 프론트엔드 트래킹이 작동하지 않음
- **원인**: RPC 함수 누락, 권한 문제, 프론트엔드 배포 문제
- **해결**: 2단계 → 4단계 순서대로 진행

### 원인 2: 캐시가 오래되었거나 비어있음 (25% 확률)
- **증상**: visitor_stats에는 데이터 있지만 캐시가 비어있음
- **원인**: Edge Function이 실행되지 않음, GitHub Actions 크론잡 미설정
- **해결**: 5단계에서 수동 캐시 업데이트

### 원인 3: RLS 정책 문제 (5% 확률)
- **증상**: 캐시에 데이터 있지만 프론트엔드에서 읽지 못함
- **원인**: visitor_stats_cache 테이블 SELECT 권한 없음
- **해결**: 6단계 RLS 정책 수정

---

## 📞 다음 단계

1. **지금 바로**: `URGENT_DIAGNOSE.sql` 실행하여 결과 확인
2. **진단 결과를 알려주세요**: 어느 단계에서 문제가 발견되었는지
3. **문제에 맞는 해결책 적용**

---

## 🔄 자동 캐시 업데이트 설정 (문제 해결 후)

문제를 해결한 후, 자동 캐시 업데이트를 설정하세요:

### 방법 1: GitHub Actions (권장)

`.github/workflows/update-visitor-cache.yml` 파일이 이미 있습니다.
이 워크플로우가 활성화되어 있는지 확인하세요.

### 방법 2: Supabase pg_cron (백업)

```sql
-- 30분마다 오늘 방문자만 업데이트
SELECT cron.schedule(
  'update-today-visitor-stats',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('type', 'today')
  );
  $$
);

-- 매일 새벽 4시(KST) 전체 통계 업데이트
SELECT cron.schedule(
  'update-full-visitor-stats',
  '0 19 * * *',  -- UTC 19:00 = KST 04:00
  $$
  SELECT net.http_post(
    url := 'https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := jsonb_build_object('type', 'full')
  );
  $$
);
```

---

## ✅ 체크리스트

문제 해결 후 다음을 확인하세요:

- [ ] `URGENT_DIAGNOSE.sql` 실행하여 모든 데이터 정상 확인
- [ ] 개발 서버에서 방문자 통계 정상 표시
- [ ] 프로덕션에서 방문자 통계 정상 표시
- [ ] 브라우저 콘솔에서 트래킹 로그 정상 출력
- [ ] 자동 캐시 업데이트 설정 완료 (GitHub Actions 또는 pg_cron)
- [ ] 내일 다시 확인하여 자동 업데이트 작동 확인

---

## 🆘 여전히 해결되지 않는다면

다음 정보를 제공해주세요:

1. `URGENT_DIAGNOSE.sql` 실행 결과 전체
2. 브라우저 콘솔 에러 메시지
3. 어느 단계에서 막혔는지
4. Edge Function 로그 (Supabase Dashboard → Edge Functions → update-visitor-stats-cache → Logs)
