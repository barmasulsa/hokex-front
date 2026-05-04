# 전시장 데이터 수집 가이드

## 개요

이 시스템은 22개 전시장의 행사 데이터를 자동으로 수집하고 Supabase에 저장합니다.

## 사용 방법

### 1. 엑셀 파일 다운로드

각 전시장 웹사이트에서 행사 일정 엑셀 파일을 다운로드합니다.

#### 다운로드 링크

**서울**
- 코엑스: https://www.coex.co.kr/event/full-schedules/ → "일정 다운로드" 버튼
- 코엑스 마곡: TBD
- aT센터: TBD
- 세텍: TBD

**수도권**
- 킨텍스: https://www.kintex.com
- 수원컨벤션센터: TBD
- 송도컨벤시아: TBD
- 수원메쎄: TBD

**충청도**
- 대전컨벤션센터: TBD
- 세종컨벤션센터: TBD
- 청주오스코: TBD

**전라도**
- 김대중컨벤션센터: TBD
- 군산새만금컨벤션센터: TBD

**강원도**
- 강릉아레나: TBD
- 원주컨벤션센터: TBD

**경상도**
- 벡스코: https://www.bexco.co.kr
- 엑스코: https://www.exco.co.kr
- 창원컨벤션센터: TBD
- 유에코: TBD
- 경주화백컨벤션센터: TBD
- 구미코: TBD

**제주도**
- 제주국제컨벤션센터: TBD

### 2. 파일 저장

다운로드한 파일을 다음 위치에 저장:
- `hokex-crawler/sample-data/{전시장코드}_schedule.xlsx`
- 또는 Downloads 폴더에 저장

**파일명 규칙:**
- 코엑스: `COEX_schedule.xls` (또는 .xlsx)
- 킨텍스: `KINTEX_schedule.xlsx`
- 벡스코: `BEXCO_schedule.xlsx`
- 엑스코: `EXCO_schedule.xlsx`
- 기타: `{전시장코드}_schedule.xlsx`

### 3. 데이터 로드

#### 특정 전시장만 로드
```bash
npm run load-venue COEX
npm run load-venue KINTEX
npm run load-venue BEXCO
```

#### 모든 전시장 로드
```bash
npm run load-all
```

## 자동화 스케줄

### 월간 업데이트 (권장)

각 전시장의 엑셀 파일은 1년치 데이터를 포함하므로, 월 1회 업데이트로 충분합니다.

**cron 설정 예시:**
```bash
# 매월 1일 오전 2시에 실행
0 2 1 * * cd /path/to/hokex-crawler && npm run load-all
```

### 수동 업데이트

새로운 행사가 추가되었을 때:
1. 해당 전시장 웹사이트에서 최신 엑셀 다운로드
2. `npm run load-venue {전시장코드}` 실행
3. 프론트엔드에서 확인

## 데이터 구조

### 필수 컬럼
- 행사명
- 시작일
- 종료일

### 선택 컬럼
- 카테고리 (전시/회의/공연)
- 산업분류
- 주최자
- 입장료
- 연락처
- 관련 사이트

## 포스터 이미지

시스템이 자동으로 "관련 사이트"에서 포스터 이미지를 크롤링합니다.

**크롤링 전략:**
1. og:image 메타 태그
2. twitter:image 메타 태그
3. 포스터 관련 클래스/ID를 가진 이미지
4. 가장 큰 이미지

포스터를 찾지 못한 경우 placeholder 이미지가 표시됩니다.

## 데이터 유지 관리

### 중복 제거

시스템이 자동으로 중복을 감지합니다:
- 같은 제목 + 같은 전시장 + 같은 시작일 = 중복

중복 발견 시 기존 데이터를 업데이트합니다.

### 오래된 데이터 삭제

종료된 행사는 자동으로 삭제되지 않습니다. 수동으로 삭제하려면:

```sql
-- Supabase SQL Editor에서 실행
DELETE FROM events 
WHERE end_date < CURRENT_DATE - INTERVAL '30 days';
```

## 문제 해결

### 파일을 찾을 수 없음
- 파일명이 `{전시장코드}_schedule.xlsx` 형식인지 확인
- `sample-data` 폴더 또는 Downloads 폴더에 있는지 확인

### 데이터가 추출되지 않음
- 엑셀 파일의 컬럼명 확인
- `src/config/venues.ts`에서 해당 전시장의 `columnMapping` 수정

### 포스터가 크롤링되지 않음
- "관련 사이트" URL이 있는지 확인
- 웹사이트가 접근 가능한지 확인
- 일부 사이트는 크롤링 방지 기능이 있을 수 있음

### Supabase 저장 실패
- `.env` 파일에 Supabase 인증 정보 확인
- RLS 정책이 올바르게 설정되었는지 확인

## 다음 단계

1. **더 많은 전시장 추가**: 각 전시장의 엑셀 다운로드 URL 확인
2. **자동 다운로드**: 웹사이트에서 자동으로 엑셀 파일 다운로드
3. **스케줄링**: cron job으로 자동 업데이트
4. **알림**: 새로운 행사 추가 시 알림 발송

## 지원

문제가 발생하면 다음을 확인하세요:
1. 로그 메시지
2. Supabase 대시보드
3. 프론트엔드 표시 상태
