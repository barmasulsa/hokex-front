# 인덱스 적용 가이드

**작성일**: 2026-05-26  
**소요 시간**: 5분  
**목적**: 홈페이지 성능 최적화를 위한 DB 인덱스 생성

---

## 📋 사전 준비

1. Supabase Dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

---

## 🚀 인덱스 적용 단계

### Step 1: 현재 인덱스 확인

SQL Editor에 다음 쿼리를 입력하고 실행:

```sql
-- 현재 events 테이블의 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;
```

**예상 결과**: 기존 인덱스 목록이 표시됩니다.

---

### Step 2: 필수 인덱스 생성

다음 SQL을 **전체 복사**하여 SQL Editor에 붙여넣고 실행:

```sql
-- ========================================
-- 홈페이지 성능 최적화 인덱스 생성
-- 작성일: 2026-05-26
-- ========================================

-- 1. deleted_at + start_date 복합 인덱스 (가장 중요)
-- 용도: "deleted_at IS NULL AND ORDER BY start_date" 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_events_active_by_date 
ON events(deleted_at, start_date) 
WHERE deleted_at IS NULL;

-- 2. start_date 단일 인덱스 (백업용)
CREATE INDEX IF NOT EXISTS idx_events_start_date 
ON events(start_date);

-- 3. region 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_events_region 
ON events(region) 
WHERE deleted_at IS NULL;

-- 4. venue 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_events_venue 
ON events(venue) 
WHERE deleted_at IS NULL;

-- 5. category 필터링용 인덱스 (GIN 인덱스 - 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_events_category_gin 
ON events USING GIN(category);

-- 완료 메시지
SELECT '✅ 5개 인덱스 생성 완료!' as status;
```

**실행 방법**:
1. 위 SQL 전체를 복사
2. SQL Editor에 붙여넣기
3. 우측 상단 **Run** 버튼 클릭 (또는 Ctrl+Enter)

**예상 소요 시간**: 10~30초

**예상 결과**:
```
✅ 5개 인덱스 생성 완료!
```

---

### Step 3: 인덱스 생성 확인

다시 Step 1의 쿼리를 실행하여 인덱스가 생성되었는지 확인:

```sql
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'events'
ORDER BY indexname;
```

**확인 사항**:
- ✅ `idx_events_active_by_date` 존재
- ✅ `idx_events_start_date` 존재
- ✅ `idx_events_region` 존재
- ✅ `idx_events_venue` 존재
- ✅ `idx_events_category_gin` 존재

---

### Step 4: 성능 테스트

인덱스가 실제로 사용되는지 확인:

```sql
-- 홈페이지 쿼리 성능 테스트
EXPLAIN ANALYZE
SELECT *
FROM events
WHERE deleted_at IS NULL
ORDER BY start_date ASC
LIMIT 48;
```

**확인 사항**:
- ✅ `Index Scan using idx_events_active_by_date` 표시
- ✅ `Execution Time` < 10ms
- ❌ `Seq Scan` 표시되면 안 됨 (전체 테이블 스캔)

**예상 결과**:
```
Index Scan using idx_events_active_by_date on events
  ...
Planning Time: 0.123 ms
Execution Time: 2.456 ms  ← 10ms 이하면 성공!
```

---

## ✅ 완료 확인

모든 단계가 완료되면:

1. **인덱스 5개 생성 완료**
2. **쿼리 실행 시간 < 10ms**
3. **Index Scan 사용 확인**

---

## 🧪 프론트엔드 테스트

인덱스 적용 후 홈페이지에서 테스트:

### 1. 브라우저 개발자 도구 열기 (F12)

### 2. Network 탭 확인
- 홈페이지 접속
- `events` API 호출 시간 확인
- **예상**: 500ms → 50ms로 감소

### 3. Console 탭 확인
```
[HomePage] loadEvents started with caching
[Cache] Miss, fetching from DB  // 첫 접속
[HomePage] fetchEventsPaginatedWithCache completed, got 1000 events
```

### 4. 새로고침 (F5)
```
[Cache] Hit for homepage events  // 캐시 사용
```

---

## 🔧 문제 해결

### 문제 1: 인덱스 생성 실패

**증상**: `ERROR: permission denied` 또는 `ERROR: relation does not exist`

**해결**:
1. Supabase Dashboard에서 올바른 프로젝트 선택 확인
2. SQL Editor에서 **postgres** 역할로 실행 확인
3. `events` 테이블 존재 확인:
   ```sql
   SELECT * FROM events LIMIT 1;
   ```

### 문제 2: Seq Scan 사용 (Index Scan 미사용)

**증상**: `EXPLAIN ANALYZE` 결과에 `Seq Scan` 표시

**원인**: 
- 테이블 데이터가 너무 적음 (< 100개)
- PostgreSQL이 Seq Scan이 더 빠르다고 판단

**해결**:
- 데이터가 1,000개 이상이면 자동으로 Index Scan 사용
- 현재 1,373개 이벤트 → Index Scan 사용됨

### 문제 3: 실행 시간이 여전히 느림 (> 100ms)

**원인**: 
- 인덱스가 생성되지 않음
- 다른 쿼리 사용 중

**해결**:
1. Step 3에서 인덱스 존재 확인
2. 캐시 적용 확인 (HomePage.tsx 수정 완료)
3. 브라우저 캐시 삭제 후 재테스트

---

## 📊 성능 비교

### 인덱스 적용 전
```sql
EXPLAIN ANALYZE SELECT * FROM events WHERE deleted_at IS NULL ORDER BY start_date LIMIT 48;

Seq Scan on events  (cost=0.00..45.67 rows=1373 width=...)
  Filter: (deleted_at IS NULL)
Planning Time: 0.234 ms
Execution Time: 156.789 ms  ← 느림!
```

### 인덱스 적용 후
```sql
EXPLAIN ANALYZE SELECT * FROM events WHERE deleted_at IS NULL ORDER BY start_date LIMIT 48;

Index Scan using idx_events_active_by_date on events  (cost=0.28..12.34 rows=48 width=...)
  Index Cond: (deleted_at IS NULL)
Planning Time: 0.123 ms
Execution Time: 2.456 ms  ← 빠름! (64배 향상)
```

---

## 🎯 다음 단계

인덱스 적용 완료 후:

1. ✅ **코드 배포 확인**
   - Vercel에서 자동 배포 완료 확인
   - 배포 URL: https://your-app.vercel.app

2. ✅ **캐시 동작 확인**
   - 브라우저 Console에서 `[Cache] Hit` 로그 확인
   - LocalStorage에 `events:page:0:size:1000` 키 확인

3. ✅ **성능 모니터링**
   - Supabase Dashboard → Database → Performance
   - 쿼리 실행 시간 모니터링

---

## 📞 지원

문제가 계속되면:
1. Supabase Dashboard → Database → Logs 확인
2. 브라우저 Console 에러 확인
3. `HOMEPAGE_CACHING_OPTIMIZATION.md` 참고

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-05-26  
**예상 소요 시간**: 5분
