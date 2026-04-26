-- Supabase RLS (Row Level Security) 정책 설정
-- 다른 사용자들이 행사 데이터를 조회할 수 있도록 공개 읽기 권한 설정

-- 1. events 테이블: 모든 사용자가 읽기 가능
CREATE POLICY "Enable read access for all users" ON "public"."events"
FOR SELECT
USING (true);

-- 2. saved_events 테이블: 인증된 사용자만 자신의 저장된 행사 조회 가능
-- (나중에 로그인 기능 추가 시 사용)
CREATE POLICY "Users can view their own saved events" ON "public"."saved_events"
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved events" ON "public"."saved_events"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved events" ON "public"."saved_events"
FOR DELETE
USING (auth.uid() = user_id);

-- 참고: Supabase 대시보드에서 실행하는 방법
-- 1. Supabase 프로젝트 대시보드 접속
-- 2. 왼쪽 메뉴에서 "SQL Editor" 클릭
-- 3. 위 쿼리를 복사해서 붙여넣기
-- 4. "Run" 버튼 클릭
