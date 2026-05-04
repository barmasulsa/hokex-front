# 자동화 가이드

## 개요

HOKEX 크롤러는 GitHub Actions를 통해 매주 자동으로 실행됩니다.

## 실행 일정

- **자동 실행**: 매주 월요일 오전 3시 (KST)
- **수동 실행**: GitHub Actions 페이지에서 언제든지 실행 가능

## 크롤링 대상

현재 자동화된 전시장:
1. **COEX** (코엑스)
2. **SETEC** (세텍)

## 로컬 테스트

### 개별 전시장 크롤링

```bash
# COEX만 크롤링
cd hokex-crawler
npm run auto-crawl-coex

# SETEC만 크롤링
npm run auto-crawl-setec
```

### 전체 크롤링

```bash
# COEX + SETEC 순차 실행
cd hokex-crawler
npm run auto-crawl-all
```

## GitHub Actions 설정

### 필수 Secrets

GitHub 저장소 Settings > Secrets and variables > Actions에서 설정:

1. `SUPABASE_URL`: Supabase 프로젝트 URL
2. `SUPABASE_SERVICE_KEY`: Supabase Service Role Key

### 수동 실행 방법

1. GitHub 저장소 페이지 이동
2. Actions 탭 클릭
3. "Weekly Exhibition Crawl" 워크플로우 선택
4. "Run workflow" 버튼 클릭
5. "Run workflow" 확인

## 실행 시간 및 비용

### 예상 실행 시간
- COEX: ~4분
- SETEC: ~4분
- **총 ~8분/주**

### GitHub Actions 무료 한도
- Private 저장소: 2,000분/월
- Public 저장소: 무제한
- **현재 사용량**: 32분/월 (8분 × 4주) ✅

### 향후 확장 시
- 22개 전시장 전체: ~110분/주 = 440분/월 ✅ (무료 범위 내)

## 크롤링 프로세스

### COEX
1. 엑셀 파일 자동 다운로드
2. 엑셀 파일 파싱
3. 데이터 정규화 및 검증
4. 포스터 이미지 크롤링
5. Supabase 저장

### SETEC
1. 일정 페이지 크롤링 (2026.01.01 ~ 2026.12.31)
2. 기본 정보 추출 (제목, 날짜, 장소, 포스터)
3. 상세 페이지 크롤링 (주최, 문의, 운영시간, 입장료)
4. Supabase 저장

## 안전 장치

### 서버 부하 방지
- 요청 간 1-2초 딜레이
- User-Agent 헤더 설정
- 배치 처리 시 5초 딜레이
- 지수 백오프 재시도 로직

### 중복 방지
- 제목 + 전시장 + 시작일 기준 중복 체크
- 중복 시 자동 스킵

### 에러 처리
- 타임아웃 설정 (10초)
- 실패 시 로그 출력
- 전체 프로세스 실패 시 exit code 1

## 모니터링

### 실행 결과 확인
1. GitHub Actions 페이지에서 워크플로우 실행 로그 확인
2. 웹사이트에서 데이터 확인: https://hokex-front.vercel.app/

### 실행 통계
- ✅ 성공: 저장된 행사 수
- ⏭️ 중복: 이미 존재하는 행사 수
- ❌ 실패: 에러 발생 행사 수

## 문제 해결

### 크롤링 실패 시
1. GitHub Actions 로그 확인
2. Supabase 연결 상태 확인
3. 대상 웹사이트 접근 가능 여부 확인
4. 수동으로 로컬에서 테스트 실행

### Secrets 오류 시
- SUPABASE_URL과 SUPABASE_SERVICE_KEY가 올바르게 설정되었는지 확인
- Service Role Key 사용 (Anon Key 아님)

## 향후 계획

### 단기 (1-2개월)
- 추가 전시장 크롤러 개발 (킨텍스, 벡스코 등)
- 개별 크롤러를 auto-crawl-all.ts에 순차 추가

### 중기 (3-6개월)
- 22개 전시장 전체 자동화
- 실행 시간 최적화
- 에러 알림 시스템 (이메일/슬랙)

### 장기 (6개월+)
- 크롤링 패턴 추출 및 공통화
- 범용 크롤러 시스템 구축
- 실시간 업데이트 지원
