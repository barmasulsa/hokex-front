# 🔧 시크릿 모드 방문 기록 중복 생성 문제 해결

## 📋 문제 상황
- **증상**: 시크릿 모드에서 페이지를 새로고침할 때마다 방문 기록이 중복 생성됨
- **원인**: localStorage가 작동하지 않아 중복 방지 로직이 실패하고, SELECT → INSERT 방식으로 인해 동시 요청 시 중복 발생
- **영향**: 방문자 통계가 부정확하게 집계됨

## ✅ 해결 방법

### 1단계: SQL 함수 생성 (Supabase Dashboard)

1. **Supabase Dashboard** 접속
2. **SQL Editor** 열기
3. `FIX_VISITOR_STATS_UPSERT.sql` 파일 내용 복사하여 실행

```sql
-- 방문자 통계 UPSERT 함수 생성
CREATE OR REPLACE FUNCTION increment_visitor_stat(
  p_visit_date DATE,
  p_visit_hour INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO visitor_stats (visit_date, visit_hour, visit_count)
  VALUES (p_visit_date, p_visit_hour, 1)
  ON CONFLICT (visit_date, visit_hour)
  DO UPDATE SET visit_count = visitor_stats.visit_count + 1;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION increment_visitor_stat(DATE, INTEGER) TO authenticated;
```

### 2단계: 프론트엔드 코드 배포

`detailedAnalytics.ts` 파일이 이미 수정되었습니다.

**변경 내용:**
- ❌ 기존: SELECT → UPDATE or INSERT (중복 가능)
- ✅ 개선: RPC 함수 호출 → UPSERT (중복 불가)

### 3단계: 배포 및 테스트

```bash
# 프론트엔드 빌드 및 배포
npm run build
vercel --prod

# 또는
git add .
git commit -m "fix: 시크릿 모드 방문 기록 중복 생성 문제 해결"
git push origin main
```

### 4단계: 검증

1. **시크릿 모드**로 사이트 접속
2. 페이지 **여러 번 새로고침**
3. Supabase Dashboard에서 확인:

```sql
-- 오늘 현재 시간대 방문 기록 확인
SELECT * FROM visitor_stats 
WHERE visit_date = CURRENT_DATE 
  AND visit_hour = EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::INTEGER;
```

**예상 결과:**
- ✅ 레코드가 **1개만** 존재
- ✅ `visit_count`가 새로고침 횟수만큼 증가

## 🎯 핵심 개선 사항

### Before (문제 있음)
```typescript
// 1. SELECT로 기존 데이터 조회
const { data: existing } = await supabase
  .from('visitor_stats')
  .select('visit_count')
  .eq('visit_date', date)
  .eq('visit_hour', hour)
  .maybeSingle();

// 2. 있으면 UPDATE, 없으면 INSERT
if (existing) {
  await supabase.from('visitor_stats').update(...);
} else {
  await supabase.from('visitor_stats').insert(...);
}
```

**문제점:**
- SELECT와 INSERT 사이에 다른 요청이 들어오면 중복 생성
- Race condition 발생 가능

### After (해결됨)
```typescript
// RPC 함수 호출: 원자적 UPSERT
const { error } = await supabase.rpc('increment_visitor_stat', {
  p_visit_date: date,
  p_visit_hour: hour
});
```

**장점:**
- ✅ 원자적 연산 (Atomic Operation)
- ✅ Race condition 방지
- ✅ 중복 생성 불가능
- ✅ 성능 향상 (1번의 DB 호출)

## 📊 테스트 시나리오

### 시나리오 1: 일반 모드
- localStorage 작동 → 하루 1회만 기록
- ✅ 정상 작동

### 시나리오 2: 시크릿 모드 (수정 전)
- localStorage 미작동 → 매번 INSERT 시도
- ❌ 중복 생성 발생

### 시나리오 3: 시크릿 모드 (수정 후)
- localStorage 미작동 → 매번 RPC 호출
- ✅ UPSERT로 중복 방지
- ✅ count만 증가

## 🔍 추가 확인 사항

### 중복 데이터 정리 (선택사항)

만약 이미 중복 데이터가 있다면:

```sql
-- 1. 중복 데이터 확인
SELECT visit_date, visit_hour, COUNT(*) as duplicate_count
FROM visitor_stats
GROUP BY visit_date, visit_hour
HAVING COUNT(*) > 1
ORDER BY visit_date DESC, visit_hour DESC;

-- 2. 중복 데이터 병합 (주의: 백업 후 실행)
WITH duplicates AS (
  SELECT 
    visit_date,
    visit_hour,
    SUM(visit_count) as total_count,
    MIN(id) as keep_id
  FROM visitor_stats
  GROUP BY visit_date, visit_hour
  HAVING COUNT(*) > 1
)
UPDATE visitor_stats v
SET visit_count = d.total_count
FROM duplicates d
WHERE v.id = d.keep_id
  AND v.visit_date = d.visit_date
  AND v.visit_hour = d.visit_hour;

-- 3. 중복 레코드 삭제
WITH duplicates AS (
  SELECT 
    visit_date,
    visit_hour,
    MIN(id) as keep_id
  FROM visitor_stats
  GROUP BY visit_date, visit_hour
  HAVING COUNT(*) > 1
)
DELETE FROM visitor_stats v
USING duplicates d
WHERE v.visit_date = d.visit_date
  AND v.visit_hour = d.visit_hour
  AND v.id != d.keep_id;
```

## ✨ 완료!

이제 시크릿 모드에서도 방문 기록이 정확하게 집계됩니다.

---

**작성일**: 2026-05-27  
**작성자**: AI Assistant  
**버전**: 1.0
