# 샘플 데이터 폴더

이 폴더는 전시장에서 다운로드한 실제 엑셀 파일을 저장하는 곳입니다.

## 사용 방법

1. 각 전시장 웹사이트에서 행사 일정 엑셀 파일을 다운로드
2. 이 폴더에 저장 (파일명 형식: `{전시장코드}_schedule.xlsx`)
3. 크롤러가 이 파일들을 파싱하여 Supabase에 저장

## 전시장별 다운로드 링크

### 서울
- **코엑스 (COEX)**: https://www.coex.co.kr/event/full-schedules/
  - 파일명: `COEX_schedule.xlsx`
  - "일정 다운로드" 버튼 클릭

- **코엑스 마곡 (COEX_MAGOK)**: TBD
  - 파일명: `COEX_MAGOK_schedule.xlsx`

- **aT센터 (AT_CENTER)**: TBD
  - 파일명: `AT_CENTER_schedule.xlsx`

- **세텍 (SETEC)**: TBD
  - 파일명: `SETEC_schedule.xlsx`

### 수도권
- **킨텍스 (KINTEX)**: https://www.kintex.com
  - 파일명: `KINTEX_schedule.xlsx`

- **수원컨벤션센터 (SUWON_CONV)**: TBD
  - 파일명: `SUWON_CONV_schedule.xlsx`

- **송도컨벤시아 (SONGDO)**: TBD
  - 파일명: `SONGDO_schedule.xlsx`

- **수원메쎄 (SUWON_MESSE)**: TBD
  - 파일명: `SUWON_MESSE_schedule.xlsx`

### 충청도
- **대전컨벤션센터 (DAEJEON_CONV)**: TBD
  - 파일명: `DAEJEON_CONV_schedule.xlsx`

- **세종컨벤션센터 (SEJONG_CONV)**: TBD
  - 파일명: `SEJONG_CONV_schedule.xlsx`

- **청주오스코 (CHEONGJU_OSCO)**: TBD
  - 파일명: `CHEONGJU_OSCO_schedule.xlsx`

### 전라도
- **김대중컨벤션센터 (KIMDAEJUNG_CONV)**: TBD
  - 파일명: `KIMDAEJUNG_CONV_schedule.xlsx`

- **군산새만금컨벤션센터 (GUNSAN_CONV)**: TBD
  - 파일명: `GUNSAN_CONV_schedule.xlsx`

### 강원도
- **강릉아레나 (GANGNEUNG_ARENA)**: TBD
  - 파일명: `GANGNEUNG_ARENA_schedule.xlsx`

- **원주컨벤션센터 (WONJU_CONV)**: TBD
  - 파일명: `WONJU_CONV_schedule.xlsx`

### 경상도
- **벡스코 (BEXCO)**: https://www.bexco.co.kr
  - 파일명: `BEXCO_schedule.xlsx`

- **엑스코 (EXCO)**: https://www.exco.co.kr
  - 파일명: `EXCO_schedule.xlsx`

- **창원컨벤션센터 (CHANGWON_CONV)**: TBD
  - 파일명: `CHANGWON_CONV_schedule.xlsx`

- **유에코 (UECO)**: TBD
  - 파일명: `UECO_schedule.xlsx`

- **경주화백컨벤션센터 (GYEONGJU_CONV)**: TBD
  - 파일명: `GYEONGJU_CONV_schedule.xlsx`

- **구미코 (GUMICO)**: TBD
  - 파일명: `GUMICO_schedule.xlsx`

### 제주도
- **제주국제컨벤션센터 (ICC_JEJU)**: TBD
  - 파일명: `ICC_JEJU_schedule.xlsx`

## 파일 형식

엑셀 파일은 다음 정보를 포함해야 합니다:
- 행사명 (필수)
- 시작일 (필수)
- 종료일 (필수)
- 카테고리 (선택)
- 산업분류 (선택)
- 주최자 (선택)
- 설명 (선택)
- 포스터 URL (선택)

## 다음 단계

1. 코엑스 엑셀 파일을 다운로드하여 `COEX_schedule.xlsx`로 저장
2. 파일 파싱 스크립트 실행: `npm run parse-excel COEX`
3. Supabase에 데이터 저장
4. 프론트엔드에서 실제 행사 확인
