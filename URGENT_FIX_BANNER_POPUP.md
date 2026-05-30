# 🚨 긴급 수정: 배너 팝업 기능 오류 해결

## 문제 상황
"배너 수정에 실패했습니다" 오류 발생

## 원인
데이터베이스에 팝업 관련 컬럼(`show_as_popup`, `popup_start_date`, `popup_end_date`)이 아직 추가되지 않음

---

## ✅ 해결 방법 (순서대로 진행)

### 1단계: Supabase에서 마이그레이션 실행 ⭐ **가장 중요!**

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **다음 SQL 실행**

```sql
-- 배너 테이블에 팝업 기능 컬럼 추가
ALTER TABLE banners
ADD COLUMN IF NOT EXISTS show_as_popup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS popup_start_date DATE,
ADD COLUMN IF NOT EXISTS popup_end_date DATE;

-- 팝업 기간 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_banners_popup_period 
ON banners(show_as_popup, popup_start_date, popup_end_date)
WHERE show_as_popup = TRUE AND is_active = TRUE;

-- 팝업 배너 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_banners_active_popup 
ON banners(type, is_active, show_as_popup)
WHERE is_active = TRUE;

-- 컬럼 설명 추가
COMMENT ON COLUMN banners.show_as_popup IS '팝업으로 표시할지 여부';
COMMENT ON COLUMN banners.popup_start_date IS '팝업 시작일 (이 날짜부터 팝업 표시)';
COMMENT ON COLUMN banners.popup_end_date IS '팝업 종료일 (이 날짜까지 팝업 표시)';
```

4. **"Run" 버튼 클릭**

5. **성공 메시지 확인**
   - "Success. No rows returned" 메시지가 나오면 성공!

---

### 2단계: 프론트엔드 재배포

```bash
cd hokex-front
npm run build
git add .
git commit -m "fix: Banner 타입에 팝업 필드 추가"
git push origin main
```

---

### 3단계: 테스트

1. **관리자 페이지 접속**
   - `/banner-management`

2. **공지사항 탭 선택**

3. **기존 배너 수정 시도**
   - 아무 배너나 선택하여 "수정" 클릭
   - 제목이나 내용 수정
   - "수정" 버튼 클릭
   - ✅ "배너가 수정되었습니다" 메시지 확인

4. **팝업 배너 생성 테스트**
   - "+ 공지사항 추가" 클릭
   - 제목, 내용 입력
   - ✅ "팝업으로 표시" 체크
   - 팝업 시작일: 오늘 날짜
   - 팝업 종료일: 일주일 후
   - "생성" 버튼 클릭
   - ✅ "배너가 생성되었습니다" 메시지 확인

5. **홈페이지에서 팝업 확인**
   - 홈페이지 새로고침
   - ✅ 팝업이 자동으로 표시되는지 확인

---

## 🔍 문제가 계속되면?

### 데이터베이스 확인

Supabase SQL Editor에서 실행:

```sql
-- 컬럼이 추가되었는지 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'banners'
ORDER BY ordinal_position;
```

**확인 사항:**
- `show_as_popup` (boolean)
- `popup_start_date` (date)
- `popup_end_date` (date)

이 3개 컬럼이 보여야 합니다.

---

### 브라우저 캐시 삭제

1. **개발자 도구 열기** (F12)
2. **Application 탭**
3. **Clear storage**
4. **"Clear site data" 클릭**
5. **페이지 새로고침** (Ctrl + Shift + R)

---

## 📝 요약

1. ⭐ **가장 중요:** Supabase SQL Editor에서 위의 SQL 실행
2. 프론트엔드 재배포 (git push)
3. 브라우저 캐시 삭제
4. 테스트

이 순서대로 진행하면 문제가 해결됩니다!
