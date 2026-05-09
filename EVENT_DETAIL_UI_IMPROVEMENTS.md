# 행사 디테일 페이지 UI 개선 및 Description 정리

## 개요
행사 디테일 페이지의 사용자 경험을 개선하고, 엑스코 행사의 잘못된 description 데이터를 정리

## 변경 사항

### 1. 행사 소개 없을 때 텍스트 변경
**변경 전**: "행사 소개 정보가 제공되지 않았습니다."
**변경 후**: "정보 없음"

**적용 전시장**:
- 킨텍스
- 엑스코
- 코엑스 및 기타 전시장

**파일**: `hokex-front/src/pages/EventDetailPage.tsx`

### 2. 관람 장소에서 "바로가기" 텍스트 제거

#### 크롤러 수정
- **파일**: `hokex-crawler/update-exco-complete.ts`
- **변경**: venueHall 수집 시 "바로가기" 텍스트 자동 제거
- **로직**: `.replace(/\s*바로가기\s*$/g, '').trim()`

#### 기존 데이터 정리
- **스크립트**: `hokex-crawler/fix-exco-venue-hall-barogagi.ts`
- **실행 결과**: 304개 엑스코 행사의 venue_hall 필드에서 "바로가기" 제거 완료
- **예시**:
  - 변경 전: "서관 3층 325 바로가기"
  - 변경 후: "서관 3층 325"

### 3. 엑스코 행사 Description 정리

#### 문제
- 엑스코 웹사이트의 네비게이션 메뉴 텍스트가 행사 소개(description)에 잘못 포함됨
- 예시: "행사안내 행사 일정 시설안내 전시장 서관 전시장 동관 전시장 회의실..."
- 영향: 304개 모든 엑스코 행사

#### 크롤러 수정
- **파일**: `hokex-crawler/update-exco-complete.ts`
- **변경**: description 추출 시 잘못된 패턴 필터링 추가
- **필터링 패턴**:
  - 행사안내, 시설안내, 전시장 서관/동관, 회의실 서관
  - 그랜드볼룸, 컨벤션홀, 오디토리움
  - 이용안내, 편의시설, 가구몰, 식음시설
  - 숙박 & 관광, 주차안내, 알림마당, 게시판
  - 미디어센터, 보도자료, 갤러리, 뉴스레터
  - EXCO 개요, About EXCO, CEO 인사말, ESG경영
  - BUSINESS, 임대문의, 케이터링/웨딩, open_in_new

#### 기존 데이터 정리
- **스크립트**: `hokex-crawler/clean-invalid-exco-descriptions.ts`
- **실행 결과**: 304개 엑스코 행사의 잘못된 description을 null로 설정
- **효과**: 프론트엔드에서 "정보 없음" 표시

### 4. 전시장 행사 페이지 링크 조건부 렌더링
- **상태**: 이미 구현되어 있음
- **로직**: `{event.venueEventPageUrl && ...}` 조건부 렌더링
- **효과**: venueEventPageUrl이 없는 행사는 링크 버튼이 표시되지 않음

### 5. 코드 정리
- 중복된 엑스코 레이아웃 조건문 제거
- TypeScript 타입 에러 해결

## 검증 방법

### 프론트엔드
1. 행사 소개가 없는 행사 페이지 접속
2. "정보 없음" 텍스트 표시 확인
3. venueEventPageUrl이 없는 행사에서 "전시장 행사 페이지" 버튼이 표시되지 않는지 확인

### 크롤러
1. 새로운 엑스코 행사 크롤링 시:
   - venue_hall에 "바로가기" 없음 확인
   - description에 네비게이션 메뉴 텍스트 없음 확인
2. 기존 304개 행사:
   - venue_hall 필드 확인
   - description이 null로 설정되었는지 확인

## 영향 범위
- **프론트엔드**: 모든 전시장의 행사 디테일 페이지
- **크롤러**: 엑스코 행사 크롤링 로직
- **데이터베이스**: 
  - 304개 엑스코 행사의 venue_hall 필드 (바로가기 제거)
  - 304개 엑스코 행사의 description 필드 (null로 설정)

## 관련 파일
- `hokex-front/src/pages/EventDetailPage.tsx` - UI 텍스트 변경
- `hokex-crawler/update-exco-complete.ts` - 크롤러 로직 수정 (바로가기 제거 + description 필터링)
- `hokex-crawler/fix-exco-venue-hall-barogagi.ts` - 기존 venue_hall 데이터 정리 스크립트
- `hokex-crawler/check-invalid-exco-descriptions.ts` - 잘못된 description 확인 스크립트
- `hokex-crawler/clean-invalid-exco-descriptions.ts` - 기존 description 데이터 정리 스크립트
