# 조회수 시스템 설명

**생성일**: 2026-05-28  
**질문**: "우리 공지사항 조회수 타인이 클릭해도 오르는 거 맞지?"

---

## ✅ **답변: 네, 맞습니다!**

**누구든지 행사를 클릭하면 조회수가 올라갑니다.**

---

## 📊 조회수 시스템 작동 방식

### 1. 조회수 증가 조건

**모든 클릭이 카운트됩니다:**
- ✅ 로그인한 사용자
- ✅ 비로그인 사용자 (익명)
- ✅ 같은 사용자의 반복 클릭
- ✅ 다른 기기에서의 클릭
- ✅ 다른 브라우저에서의 클릭

**중복 방지 없음:**
- ❌ IP 주소 기반 중복 방지 없음
- ❌ 쿠키 기반 중복 방지 없음
- ❌ 세션 기반 중복 방지 없음
- ❌ 하루 1회 제한 없음

---

## 🔍 기술적 구현

### 프론트엔드 (EventDetailPage.tsx)

```typescript
// 행사 상세 페이지 진입 시 자동 호출
useEffect(() => {
  if (event?.id) {
    incrementViewCount(event.id.toString());
  }
}, [event?.id]);
```

**작동 시점**: 사용자가 행사 상세 페이지를 열 때마다

---

### 백엔드 (eventService.ts)

```typescript
export async function incrementViewCount(eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.rpc('increment_event_view_count', {
      p_event_id: eventId,
      p_user_id: user?.id || null  // 로그인 사용자면 ID 전달, 아니면 null
    });

    if (error) {
      console.error(`Error incrementing view count:`, error);
    } else {
      console.log(`Successfully incremented view count for event ${eventId}`);
    }
  } catch (err) {
    console.error(`Exception incrementing view count:`, err);
  }
}
```

**특징**:
- 로그인 여부와 관계없이 항상 실행
- 에러가 발생해도 사용자 경험에 영향 없음 (백그라운드 처리)

---

### 데이터베이스 (RPC 함수)

```sql
CREATE OR REPLACE FUNCTION increment_event_view_count(
  p_event_id INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. events 테이블의 누적 조회수 증가
  UPDATE events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_event_id;
  
  -- 2. 조회 로그 기록 (통계 분석용)
  INSERT INTO event_views_log (event_id, user_id, ip_address, user_agent)
  VALUES (p_event_id, p_user_id, p_ip_address, p_user_agent);
END;
$$;
```

**작동 방식**:
1. **무조건 조회수 +1** (중복 체크 없음)
2. 로그 테이블에 기록 (통계 분석용)

---

## 📈 데이터 저장 구조

### 1. `events` 테이블 (누적 조회수)

```sql
SELECT id, title, view_count FROM events WHERE id = 123;
```

| id  | title        | view_count |
|-----|--------------|------------|
| 123 | 2026 박람회  | 1,234      |

**특징**: 
- 누적 조회수 (총합)
- 매 클릭마다 +1

---

### 2. `event_views_log` 테이블 (상세 로그)

```sql
SELECT * FROM event_views_log WHERE event_id = 123 ORDER BY viewed_at DESC LIMIT 5;
```

| id  | event_id | user_id | viewed_at           | ip_address | user_agent |
|-----|----------|---------|---------------------|------------|------------|
| 501 | 123      | abc-123 | 2026-05-28 14:30:00 | 1.2.3.4    | Chrome     |
| 500 | 123      | NULL    | 2026-05-28 14:25:00 | 5.6.7.8    | Safari     |
| 499 | 123      | abc-123 | 2026-05-28 14:20:00 | 1.2.3.4    | Chrome     |
| 498 | 123      | def-456 | 2026-05-28 14:15:00 | 9.10.11.12 | Firefox    |
| 497 | 123      | NULL    | 2026-05-28 14:10:00 | 13.14.15.16| Edge       |

**특징**:
- 모든 클릭 기록 저장
- 로그인 사용자는 `user_id` 기록
- 비로그인 사용자는 `user_id = NULL`
- 기간별 통계 분석 가능

---

## 🎯 실제 사용 예시

### 시나리오 1: 같은 사용자가 3번 클릭

```
사용자 A (로그인)
  ↓
행사 상세 페이지 방문 (1회) → view_count: 1
  ↓
뒤로가기 후 다시 방문 (2회) → view_count: 2
  ↓
새로고침 (3회) → view_count: 3
```

**결과**: ✅ 조회수 3 증가

---

### 시나리오 2: 다른 사용자들이 클릭

```
사용자 A (로그인) → view_count: 1
사용자 B (로그인) → view_count: 2
사용자 C (비로그인) → view_count: 3
사용자 D (비로그인) → view_count: 4
```

**결과**: ✅ 조회수 4 증가

---

### 시나리오 3: 같은 사용자, 다른 기기

```
사용자 A - PC (로그인) → view_count: 1
사용자 A - 모바일 (로그인) → view_count: 2
사용자 A - 태블릿 (로그인) → view_count: 3
```

**결과**: ✅ 조회수 3 증가

---

## 📊 통계 분석 기능

### 관리자 대시보드에서 확인 가능

**1. 누적 조회수 (전체 기간)**
```sql
SELECT title, view_count 
FROM events 
ORDER BY view_count DESC 
LIMIT 10;
```

**2. 기간별 조회수 (최근 7일, 30일 등)**
```sql
SELECT event_id, COUNT(*) as view_count
FROM event_views_log
WHERE viewed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_id
ORDER BY view_count DESC;
```

**3. 사용자별 조회 패턴**
```sql
-- 로그인 사용자 vs 비로그인 사용자
SELECT 
  CASE WHEN user_id IS NULL THEN '비로그인' ELSE '로그인' END as user_type,
  COUNT(*) as view_count
FROM event_views_log
GROUP BY user_type;
```

---

## ⚠️ 주의사항

### 현재 시스템의 특징

**장점**:
- ✅ 구현이 단순하고 빠름
- ✅ 모든 클릭이 기록되어 정확한 트래픽 파악 가능
- ✅ 로그 데이터로 상세 분석 가능

**단점**:
- ⚠️ 같은 사용자의 반복 클릭도 카운트됨
- ⚠️ 봇이나 크롤러의 접근도 카운트될 수 있음
- ⚠️ 실제 "순 방문자 수"와는 다를 수 있음

---

## 🔧 중복 방지 기능 추가 (선택사항)

만약 중복 방지가 필요하다면 다음과 같은 방법을 추가할 수 있습니다:

### 방법 1: 하루 1회 제한 (localStorage)

```typescript
export async function incrementViewCount(eventId: string) {
  const today = new Date().toISOString().split('T')[0];
  const viewKey = `event_view_${eventId}_${today}`;
  
  // 오늘 이미 조회했는지 확인
  if (localStorage.getItem(viewKey)) {
    console.log('Already viewed today');
    return;
  }
  
  // 조회수 증가
  await supabase.rpc('increment_event_view_count', {
    p_event_id: eventId,
    p_user_id: user?.id || null
  });
  
  // 오늘 조회 기록
  localStorage.setItem(viewKey, 'true');
}
```

**효과**: 같은 브라우저에서 하루에 1번만 카운트

---

### 방법 2: 세션당 1회 제한 (sessionStorage)

```typescript
export async function incrementViewCount(eventId: string) {
  const viewKey = `event_view_${eventId}`;
  
  // 이번 세션에서 이미 조회했는지 확인
  if (sessionStorage.getItem(viewKey)) {
    console.log('Already viewed in this session');
    return;
  }
  
  // 조회수 증가
  await supabase.rpc('increment_event_view_count', {
    p_event_id: eventId,
    p_user_id: user?.id || null
  });
  
  // 세션 조회 기록
  sessionStorage.setItem(viewKey, 'true');
}
```

**효과**: 브라우저를 닫기 전까지 1번만 카운트

---

### 방법 3: DB 기반 중복 방지 (가장 정확)

```sql
CREATE OR REPLACE FUNCTION increment_event_view_count(
  p_event_id INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_viewed BOOLEAN;
BEGIN
  -- 오늘 이미 조회했는지 확인
  SELECT EXISTS(
    SELECT 1 FROM event_views_log
    WHERE event_id = p_event_id
      AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
      AND viewed_at >= CURRENT_DATE
  ) INTO v_already_viewed;
  
  -- 이미 조회했으면 종료
  IF v_already_viewed THEN
    RETURN;
  END IF;
  
  -- 조회수 증가
  UPDATE events
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_event_id;
  
  -- 로그 기록
  INSERT INTO event_views_log (event_id, user_id)
  VALUES (p_event_id, p_user_id);
END;
$$;
```

**효과**: 
- 로그인 사용자: 하루 1번만 카운트
- 비로그인 사용자: 매번 카운트 (IP 추적 없음)

---

## 📝 결론

### 현재 시스템

**✅ 타인이 클릭하면 조회수가 올라갑니다.**

- 로그인 사용자든 비로그인 사용자든 상관없이 모든 클릭이 카운트됩니다.
- 같은 사용자가 여러 번 클릭해도 매번 카운트됩니다.
- 중복 방지 기능은 현재 없습니다.

### 데이터 확인 방법

**Supabase SQL Editor에서 실행**:

```sql
-- 특정 행사의 조회수 확인
SELECT id, title, view_count 
FROM events 
WHERE id = 123;

-- 최근 조회 로그 확인
SELECT * 
FROM event_views_log 
WHERE event_id = 123 
ORDER BY viewed_at DESC 
LIMIT 10;

-- 상위 조회수 행사 확인
SELECT title, venue, view_count 
FROM events 
WHERE deleted_at IS NULL
ORDER BY view_count DESC 
LIMIT 20;
```

---

**생성일**: 2026-05-28  
**버전**: 1.0  
**상태**: ✅ 모든 클릭이 조회수로 카운트됨
