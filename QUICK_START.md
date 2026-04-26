# HOKEX 테스트 서버 빠른 시작 가이드

## 현재 상태
✅ 프론트엔드 서버 실행 중: http://localhost:5173
✅ Supabase 연결 완료
⚠️ 중복 행사 데이터 제거 필요

## 1단계: 중복 행사 제거 (필수)

### Supabase SQL Editor에서 실행:

1. [Supabase 대시보드](https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig) 접속
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. 아래 SQL을 순서대로 실행:

#### A. 중복 확인
```sql
SELECT title, start_date, end_date, COUNT(*) as duplicate_count
FROM events
GROUP BY title, start_date, end_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

#### B. 중복 제거 (주의: 되돌릴 수 없음!)
```sql
DELETE FROM events a
USING events b
WHERE a.id > b.id
  AND a.title = b.title
  AND a.start_date = b.start_date
  AND a.end_date = b.end_date;
```

#### C. 중복 방지 설정
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique_title_dates 
ON events(title, start_date, end_date);
```

#### D. 결과 확인
```sql
SELECT title, start_date, end_date, COUNT(*) as count
FROM events
GROUP BY title, start_date, end_date
ORDER BY title;
```

모든 행사의 count가 1이어야 합니다.

## 2단계: 웹사이트 테스트

브라우저에서 http://localhost:5173 접속

### 테스트 항목:

#### 홈페이지 (/)
- [ ] 행사 목록이 표시되는가?
- [ ] 중복 행사가 없는가?
- [ ] 필터가 작동하는가?
  - 지역 선택 → 해당 지역 전시장 표시
  - 연도 선택 (2026 기본값)
  - 카테고리 선택 (전시/회의/공연)
  - 산업 분류 선택 (18개 항목)
- [ ] 행사 카드 클릭 시 상세 페이지로 이동하는가?

#### 행사 상세 페이지 (/event/:id)
- [ ] 행사 정보가 표시되는가?
- [ ] 히어로 섹션이 보이는가?
- [ ] 탭 네비게이션이 작동하는가?
- [ ] 프로그램 일정이 표시되는가?
- [ ] 장소 정보가 보이는가?
- [ ] 관련 행사가 표시되는가?

#### 관리자 모드
1. 헤더에서 "관리자 모드" 토글 ON
2. 행사 정보 클릭하여 인라인 편집 가능한지 확인
3. 토글 OFF 시 편집 불가능한지 확인

## 3단계: 데이터 추가 테스트

### Supabase Table Editor에서:

1. **Table Editor** > **events** 테이블 선택
2. "Insert row" 클릭
3. 새 행사 정보 입력:
   - title: "테스트 행사"
   - poster_url: "https://via.placeholder.com/400x300"
   - region: "서울"
   - venue: "코엑스"
   - start_date: "2026-12-01"
   - end_date: "2026-12-03"
   - day_string: "(화)"
   - category: "전시"
   - industry: "기타"
4. "Save" 클릭
5. 웹사이트 새로고침하여 새 행사가 표시되는지 확인

## 4단계: 필터 테스트

### 지역별 필터:
- "전체" → 모든 행사 표시
- "서울" → 서울 지역 행사만 표시
- "경상도" → 경상도 지역 행사만 표시

### 전시장별 필터:
- 지역 선택 후 해당 지역의 전시장만 표시되는지 확인
- 예: "서울" 선택 → "코엑스", "세텍" 등만 표시

### 연도별 필터:
- 2026 (기본값) → 2026년 행사만 표시
- 다른 연도 선택 → 해당 연도 행사만 표시

### 카테고리별 필터:
- "전시" → 전시 행사만 표시
- "회의" → 회의 행사만 표시
- "공연" → 공연 행사만 표시

### 산업별 필터:
- "농수축산/식음료" → 해당 산업 행사만 표시
- "뷰티/화장품" → 해당 산업 행사만 표시
- 여러 개 선택 가능

## 5단계: 성능 확인

### 개발자 도구 (F12) 열기:

1. **Console** 탭 확인
   - 에러 메시지가 없어야 함
   - Supabase 연결 성공 메시지 확인

2. **Network** 탭 확인
   - Supabase API 호출 성공 (200 OK)
   - 응답 시간 확인

## 문제 해결

### 행사가 표시되지 않음
1. Supabase 대시보드 > Table Editor > events 테이블 확인
2. 데이터가 있는지 확인
3. RLS 정책 확인 (모든 사용자가 읽기 가능해야 함)

### 중복 행사가 여전히 표시됨
1. 1단계의 중복 제거 SQL을 다시 실행
2. 브라우저 캐시 삭제 (Ctrl + Shift + R)
3. 페이지 새로고침

### 필터가 작동하지 않음
1. 브라우저 콘솔에서 에러 메시지 확인
2. FilterEngine 로직 확인
3. 데이터 형식 확인 (날짜, 지역, 카테고리 등)

## 다음 단계

✅ 중복 제거 완료
✅ 기본 기능 테스트 완료
⬜ 사용자 인증 구현
⬜ 행사 저장 기능 구현
⬜ 실제 행사 데이터 크롤링
⬜ 이미지 업로드 기능
⬜ 프로덕션 배포

## 서버 관리

### 개발 서버 중지:
```bash
# 터미널에서 Ctrl + C
```

### 개발 서버 재시작:
```bash
cd hokex-front
npm run dev
```

### 빌드 (프로덕션):
```bash
cd hokex-front
npm run build
npm run preview
```

## 유용한 링크

- 프론트엔드: http://localhost:5173
- Supabase 대시보드: https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig
- Supabase SQL Editor: https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/sql
- Supabase Table Editor: https://supabase.com/dashboard/project/qmhxnxnaawtjelqlgyig/editor

## 지원

문제가 발생하면:
1. `중복행사제거가이드.md` 참고
2. `SUPABASE_SETUP.md` 참고
3. 브라우저 개발자 도구 콘솔 확인
