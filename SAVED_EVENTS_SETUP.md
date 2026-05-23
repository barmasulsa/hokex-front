# 행사 찜하기(저장) 기능 설정 가이드

## 개요
사용자가 행사 카드에서 하트 버튼을 눌러 행사를 저장(찜)할 수 있고, 프로필 페이지에서 저장된 행사 목록을 볼 수 있는 기능입니다.

## 1. DB 마이그레이션 실행

Supabase Dashboard에서 SQL Editor를 열고 다음 파일의 내용을 실행하세요:

```
hokex-front/supabase-migrations/create-saved-events-table.sql
```

이 마이그레이션은 다음을 생성합니다:
- `saved_events` 테이블 (user_id, event_id, created_at)
- UNIQUE constraint (user_id, event_id) - 중복 방지
- 인덱스 (조회 성능 향상)
- RLS 정책 (사용자는 자신의 저장 목록만 조회/수정 가능)

## 2. 기능 확인

### 2.1 홈페이지에서 찜하기
1. 홈페이지에서 행사 카드의 하트 버튼 클릭
2. 하트가 빨간색으로 채워지면 저장됨
3. 다시 클릭하면 저장 취소

### 2.2 프로필 페이지에서 확인
1. 프로필 페이지 접속
2. "Saved/Favorite Events" 섹션에서 저장된 행사 확인
3. 최대 6개까지 표시 (최신순)

## 3. 구현 내용

### 3.1 DB 테이블
```sql
CREATE TABLE saved_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  created_at TIMESTAMP,
  UNIQUE(user_id, event_id)
);
```

### 3.2 서비스 함수
- `fetchSavedEvents(userId)` - 사용자의 저장된 행사 목록 가져오기
- `fetchSavedEventIds(userId)` - 저장된 행사 ID 목록 가져오기 (빠른 조회)
- `toggleSaveEvent(userId, eventId)` - 저장/취소 토글
- `saveEvent(userId, eventId)` - 저장
- `unsaveEvent(userId, eventId)` - 취소

### 3.3 UI 업데이트
- `HomePage.tsx`: 하트 버튼 클릭 시 DB 저장/취소
- `UserProfilePage.tsx`: 실제 저장된 행사 표시
- `EventCard.tsx`: 하트 버튼 UI (이미 구현됨)

## 4. 배포

### 4.1 Git 커밋 및 푸시
```bash
cd hokex-front
git add .
git commit -m "feat: 행사 찜하기(저장) 기능 추가"
git push
```

### 4.2 Vercel 자동 배포
- Git push 후 Vercel이 자동으로 배포합니다
- 배포 완료 후 https://hokex.vercel.app 에서 확인

### 4.3 DB 마이그레이션 실행
1. Supabase Dashboard 접속
2. SQL Editor 열기
3. `create-saved-events-table.sql` 내용 붙여넣기
4. Run 클릭

## 5. 테스트

### 5.1 기본 테스트
1. 로그인
2. 홈페이지에서 행사 하트 버튼 클릭
3. 프로필 페이지에서 저장된 행사 확인
4. 하트 버튼 다시 클릭해서 취소
5. 프로필 페이지에서 사라진 것 확인

### 5.2 DB 확인
```sql
-- 저장된 행사 확인
SELECT 
  se.id,
  se.created_at,
  up.email,
  e.title
FROM saved_events se
JOIN user_profiles up ON se.user_id = up.id
JOIN events e ON se.event_id = e.id
ORDER BY se.created_at DESC
LIMIT 10;

-- 사용자별 저장 개수
SELECT 
  up.email,
  COUNT(*) as saved_count
FROM saved_events se
JOIN user_profiles up ON se.user_id = up.id
GROUP BY up.email
ORDER BY saved_count DESC;
```

## 6. 주요 특징

### 6.1 낙관적 업데이트
- 하트 버튼 클릭 시 UI가 즉시 반영됩니다
- DB 저장이 실패하면 원래 상태로 되돌립니다

### 6.2 중복 방지
- UNIQUE constraint로 같은 행사를 여러 번 저장할 수 없습니다

### 6.3 RLS 보안
- 사용자는 자신의 저장 목록만 조회/수정할 수 있습니다

### 6.4 성능 최적화
- 인덱스로 조회 성능 향상
- `fetchSavedEventIds`로 빠른 ID 조회

## 7. 문제 해결

### 7.1 하트 버튼이 작동하지 않음
- 브라우저 콘솔에서 에러 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 사용자가 로그인되어 있는지 확인

### 7.2 프로필 페이지에 저장된 행사가 표시되지 않음
- DB에 실제로 저장되었는지 확인
- `fetchSavedEvents` 함수가 올바르게 호출되는지 확인
- 브라우저 콘솔에서 에러 확인

### 7.3 중복 저장 에러
- UNIQUE constraint 에러는 정상입니다
- `toggleSaveEvent` 함수가 이미 처리하고 있습니다

## 완료! 🎉

이제 사용자가 행사를 저장하고 프로필 페이지에서 확인할 수 있습니다.
