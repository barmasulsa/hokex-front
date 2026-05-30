# 알림 기능 설정 가이드

## 문제 상황
- 관리자 페이지에서 알림 생성 시 "알림 생성에 실패했습니다" 에러 발생
- 원인: Supabase에 `announcements` 테이블이 아직 생성되지 않음

## 해결 방법

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. `hokex` 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 실행
1. **New Query** 버튼 클릭
2. 아래 SQL 전체를 복사하여 붙여넣기
3. **Run** 버튼 클릭 (또는 Ctrl+Enter)

```sql
-- announcements 테이블 생성
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal', 'important', 'update')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_announcements_active_dates 
ON announcements(is_active, start_date, end_date)
WHERE is_active = true;

-- RLS 활성화
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 알림 조회 가능
CREATE POLICY "Anyone can view active announcements"
ON announcements FOR SELECT
USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- 관리자만 알림 생성/수정/삭제 가능
CREATE POLICY "Only admins can manage announcements"
ON announcements FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email IN (
      'lcw5506@naver.com',
      'admin@hokex.kr'
    )
  )
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_announcements_updated_at();
```

### 3단계: 테이블 생성 확인
1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. `announcements` 테이블이 생성되었는지 확인
3. 테이블 구조 확인:
   - id (UUID)
   - title (TEXT)
   - content (TEXT)
   - type (TEXT) - 'normal', 'important', 'update' 중 하나
   - start_date (TIMESTAMP)
   - end_date (TIMESTAMP)
   - is_active (BOOLEAN)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

### 4단계: 알림 생성 테스트
1. 관리자 페이지 접속: https://hokex.kr/banner-management
2. **🔔 알림 관리** 탭 클릭
3. 알림 생성 폼 작성:
   - 제목: "테스트 알림"
   - 내용: "알림 기능이 정상적으로 작동합니다!"
   - 종류: 🔔 일반 알림
   - 시작일: 오늘
   - 종료일: 내일
4. **알림 생성** 버튼 클릭
5. 성공 메시지 확인

### 5단계: 홈페이지에서 알림 확인
1. 홈페이지 접속: https://hokex.kr
2. 알림 모달이 자동으로 표시되는지 확인
3. "확인" 버튼 클릭 후 다시 표시되지 않는지 확인
4. "오늘 하루 보지 않기" 버튼 동작 확인

## 알림 종류별 스타일

### 🔔 일반 알림 (normal)
- 파란색 테두리
- 일반적인 공지사항

### ⚠️ 중요 공지 (important)
- 빨간색 테두리
- 긴급하거나 중요한 내용

### ✨ 업데이트 소식 (update)
- 초록색 테두리
- 새로운 기능이나 개선사항

## 알림 관리 기능

### 알림 생성
- 제목, 내용, 종류, 기간 설정
- RichTextEditor로 서식 있는 내용 작성 가능

### 알림 수정
- 기존 알림의 내용 수정
- 활성화/비활성화 토글

### 알림 삭제
- 불필요한 알림 삭제
- 삭제 전 확인 메시지 표시

### 알림 목록
- 모든 알림 목록 표시
- 활성화 상태, 기간, 종류 확인

## 문제 해결

### 알림이 표시되지 않는 경우
1. 알림의 `is_active`가 `true`인지 확인
2. 현재 시간이 `start_date`와 `end_date` 사이인지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 알림 생성이 실패하는 경우
1. Supabase에서 `announcements` 테이블이 생성되었는지 확인
2. RLS 정책이 올바르게 설정되었는지 확인
3. 관리자 이메일로 로그인했는지 확인

### 알림이 계속 표시되는 경우
1. 브라우저 개발자 도구 → Application → Local Storage 확인
2. `announcement_dismissed_*` 키 확인
3. 필요시 Local Storage 초기화

## 참고사항

- 알림은 localStorage에 "본 알림" 정보를 저장합니다
- 같은 브라우저에서는 한 번 본 알림이 다시 표시되지 않습니다
- 다른 브라우저나 시크릿 모드에서는 다시 표시됩니다
- "오늘 하루 보지 않기"는 24시간 동안 모든 알림을 숨깁니다

## 완료!

이제 알림 기능이 정상적으로 작동합니다. 관리자 페이지에서 알림을 생성하면 사용자들에게 자동으로 표시됩니다.
