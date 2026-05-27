# 방문자 추적 디버깅 가이드

## 현재 상황
- DB에 오늘 12시 방문 1건만 기록됨
- 시크릿 모드 테스트 시 새로운 기록이 생성되지 않음

## 문제 원인 가능성

### 1. 시크릿 모드에서 콘솔 로그 확인
시크릿 모드로 접속 후 F12 → Console에서 다음 로그를 확인:

**정상 케이스:**
```
[recordDetailedVisit] Recording new visit for 2026-05-27
```

**비정상 케이스:**
```
[recordDetailedVisit] Already visited today, skipping
[recordDetailedVisit] Already recorded in this session, skipping
```

### 2. 현재 시간 확인
DB에 12시(정오)만 기록된 이유:
- 실제 방문 시간이 12시였거나
- 시스템 시간대 설정 문제

**확인 방법:**
```javascript
// 브라우저 콘솔에서 실행
console.log('현재 시간:', new Date().getHours());
console.log('현재 날짜:', new Date().toISOString().split('T')[0]);
```

### 3. DB 저장 실패 가능성
`recordToDBAsync()` 함수가 에러를 무시하도록 설계됨:

```typescript
recordToDBAsync(date, hour).catch(err => {
  console.log('방문 통계 DB 저장 실패 (무시):', err.message);
});
```

**확인 방법:**
- 콘솔에서 "방문 통계 DB 저장 실패" 메시지 확인
- Supabase RLS 정책 확인 (익명 사용자 INSERT 권한)

## 즉시 테스트 방법

### Step 1: 시크릿 모드 테스트
1. `Ctrl + Shift + N` (Chrome 시크릿 모드)
2. 홈페이지 접속: https://your-site.vercel.app
3. `F12` → Console 탭 열기
4. 다음 명령어 실행:

```javascript
// 현재 시간 확인
console.log('현재 시간:', new Date().getHours() + '시');

// localStorage 확인 (비어있어야 정상)
console.log('last_visit_date:', localStorage.getItem('last_visit_date'));
```

### Step 2: DB 확인 쿼리
Supabase SQL Editor에서 실행:

```sql
-- 오늘 모든 시간대 방문 기록 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at,
  updated_at
FROM visitor_stats
WHERE visit_date = CURRENT_DATE
ORDER BY visit_hour;

-- 최근 5분 내 생성된 기록 확인
SELECT 
  visit_date,
  visit_hour,
  visit_count,
  created_at
FROM visitor_stats
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

### Step 3: RLS 정책 확인
```sql
-- visitor_stats 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'visitor_stats';
```

## 예상 결과

### 정상 작동 시:
1. 시크릿 모드 콘솔: "Recording new visit for 2026-05-27"
2. DB: 현재 시간대에 새로운 레코드 생성 또는 count 증가
3. 예: 지금이 15시라면 `visit_hour = 15, visit_count = 1` 생성

### 문제 발생 시:
1. 콘솔에 에러 메시지 확인
2. RLS 정책으로 인한 INSERT 실패 가능성
3. 시간대 불일치 (서버 vs 클라이언트)

## 해결 방법

### 문제 1: RLS 정책 문제
```sql
-- 익명 사용자도 INSERT 가능하도록 정책 추가
CREATE POLICY "Allow anonymous insert visitor stats"
ON visitor_stats
FOR INSERT
TO anon
WITH CHECK (true);
```

### 문제 2: 시간대 불일치
코드에서 `new Date().getHours()`는 **클라이언트 로컬 시간**을 사용합니다.
- 한국 시간: UTC+9
- 서버가 UTC 기준이면 9시간 차이 발생

### 문제 3: 세션 플래그 문제
`hasRecordedThisSession` 플래그가 페이지 새로고침 없이 유지될 수 있음.

**임시 해결:**
```typescript
// 페이지 로드 시 플래그 초기화
window.addEventListener('load', () => {
  hasRecordedThisSession = false;
});
```

## 다음 단계

1. **시크릿 모드 콘솔 로그 확인** (가장 중요!)
2. **현재 시간 vs DB 기록 시간 비교**
3. **RLS 정책 확인 및 수정**
4. **5분 후 다시 DB 쿼리 실행**

---

**지금 바로 해보세요:**
1. 시크릿 모드로 접속
2. F12 → Console 확인
3. 로그 내용을 알려주세요!
