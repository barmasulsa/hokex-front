# RLS 정책 수정 가이드

## 문제 상황
- 데이터베이스에는 엑스코 행사 347개가 있음
- 프론트엔드(ANON 키)로는 322개만 조회됨
- **25개 행사가 RLS 정책에 의해 차단되고 있음**
- 특히 6월 이후 행사 21개가 모두 차단됨

## 해결 방법

### 1. Supabase 대시보드 접속
https://supabase.com/dashboard

### 2. SQL Editor로 이동
프로젝트 선택 → SQL Editor

### 3. 다음 SQL 실행

```sql
-- 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON events;

-- 모든 사용자가 모든 이벤트를 읽을 수 있도록 새 정책 생성
CREATE POLICY "Allow public read access to all events"
ON events
FOR SELECT
TO public
USING (true);

-- 인증된 사용자만 삽입/수정/삭제 가능
CREATE POLICY "Allow authenticated insert"
ON events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
ON events
FOR DELETE
TO authenticated
USING (true);

-- RLS 활성화 확인
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### 4. 확인
SQL 실행 후 프론트엔드를 새로고침하면 모든 347개 행사가 표시됩니다.

## 왜 이런 문제가 발생했나?
- RLS 정책이 일부 행사에 대해 public 접근을 차단하고 있었음
- 크롤러는 서비스 키를 사용하므로 RLS를 우회하여 모든 데이터를 볼 수 있음
- 프론트엔드는 ANON 키를 사용하므로 RLS 정책의 영향을 받음
- 새로운 정책은 모든 public 사용자가 모든 이벤트를 읽을 수 있도록 허용
