# Google Analytics 4 (GA4) 설정 가이드

## 개요
이 프로젝트는 방문자 통계를 추적하기 위해 Google Analytics 4를 지원합니다.

## 현재 구현 상태
- ✅ 로컬 스토리지 기반 방문자 통계 (기본 기능)
- ✅ GA4 초기화 코드 준비 완료
- ⏳ GA4 측정 ID 설정 필요

## GA4 설정 방법

### 1단계: Google Analytics 4 계정 생성
1. [Google Analytics](https://analytics.google.com/) 접속
2. "측정 시작" 클릭
3. 계정 이름 입력 (예: "HOKEX")
4. 속성 이름 입력 (예: "HOKEX 웹사이트")
5. 보고 시간대: "대한민국"
6. 통화: "대한민국 원 (₩)"

### 2단계: 데이터 스트림 설정
1. "웹" 선택
2. 웹사이트 URL 입력: `https://hokex.vercel.app`
3. 스트림 이름 입력: "HOKEX 프로덕션"
4. "스트림 만들기" 클릭

### 3단계: 측정 ID 확인
1. 데이터 스트림 세부정보 페이지에서 **측정 ID** 확인
2. 형식: `G-XXXXXXXXXX`

### 4단계: 환경 변수 설정

#### 로컬 개발 환경
`.env` 파일에 측정 ID 추가:
```bash
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Vercel 배포 환경
1. Vercel 대시보드 접속
2. 프로젝트 선택 (hokex-front)
3. Settings → Environment Variables
4. 새 환경 변수 추가:
   - Name: `VITE_GA4_MEASUREMENT_ID`
   - Value: `G-XXXXXXXXXX`
   - Environment: Production, Preview, Development 모두 선택
5. "Save" 클릭
6. 재배포 (Redeploy) 필요

### 5단계: 배포 및 확인
1. 코드 변경사항 커밋 및 푸시
2. Vercel 자동 배포 대기
3. 배포 완료 후 웹사이트 접속
4. 브라우저 개발자 도구 → Console 확인
   - "GA4 초기화 완료: G-XXXXXXXXXX" 메시지 확인
5. Google Analytics 대시보드에서 실시간 데이터 확인

## 기능 설명

### 로컬 스토리지 기반 통계 (기본)
- 브라우저의 로컬 스토리지에 방문 기록 저장
- 오늘, 최근 7일, 최근 30일 방문자 수 집계
- 장점: 설정 불필요, 즉시 사용 가능
- 단점: 브라우저별로 독립적, 정확도 낮음

### Google Analytics 4 (선택)
- 구글 서버에서 방문자 데이터 수집 및 분석
- 실시간 방문자, 페이지뷰, 이벤트 추적
- 장점: 정확한 통계, 다양한 분석 기능
- 단점: 초기 설정 필요

## 추적되는 이벤트
- 페이지 방문 (자동)
- 페이지뷰 (자동)
- 사용자 세션 (자동)

## 주의사항
1. GA4 측정 ID는 공개되어도 안전합니다 (클라이언트 사이드에서 사용)
2. 개인정보 보호 정책에 따라 쿠키 동의 배너가 필요할 수 있습니다
3. 데이터 수집까지 24-48시간 소요될 수 있습니다

## 문제 해결

### "GA4 측정 ID가 설정되지 않았습니다" 경고
- `.env` 파일에 `VITE_GA4_MEASUREMENT_ID` 추가
- Vercel 환경 변수 설정 확인
- 재배포 후 확인

### 통계가 표시되지 않음
- 로컬 스토리지 기반 통계는 즉시 표시됨
- GA4 데이터는 24-48시간 후 표시됨
- 브라우저 콘솔에서 에러 메시지 확인

### GA4 스크립트 로드 실패
- 네트워크 연결 확인
- 광고 차단 프로그램 비활성화
- 브라우저 개발자 도구 → Network 탭 확인

## 참고 자료
- [Google Analytics 4 공식 문서](https://support.google.com/analytics/answer/9304153)
- [GA4 측정 ID 찾기](https://support.google.com/analytics/answer/9539598)
- [Vite 환경 변수 가이드](https://vitejs.dev/guide/env-and-mode.html)
