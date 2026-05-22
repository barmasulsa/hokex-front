# ICC Jeju 카테고리별 커스텀 포스터 배포 완료

## 배포 정보
- **배포 일시**: 2026-05-22
- **배포 환경**: Vercel (프로덕션)
- **커밋 해시**: 11519f3
- **배포 URL**: https://hokex.vercel.app

## 배포 내용

### 1. 커스텀 포스터 이미지 추가
```
public/images/
├── icc_jeju_convention.png  (회의 - 청록색 배경)
├── icc_jeju_exhibition.png  (전시 - 파란색 배경)
└── icc_jeju_event.png       (이벤트 - 회색 배경)
```

### 2. 포스터 적용 규칙
- **bg1.jpg + 전시** → 전시 커스텀 포스터
- **bg2.jpg + 회의** → 회의 커스텀 포스터
- **bg1.jpg + 이벤트** → 이벤트 커스텀 포스터
- **고유 포스터** → 원본 유지 (변경 없음)

### 3. 적용 결과
- 총 26개 ICC Jeju 행사
- 커스텀 포스터 적용: 13개
- 고유 포스터 유지: 13개

## 검증 방법

### 프로덕션 확인
1. https://hokex.vercel.app 접속
2. 지역 필터에서 "제주도" 선택
3. ICC Jeju 행사 포스터 확인:
   - 회의 행사: 청록색 배경 포스터
   - 전시 행사: 파란색 배경 포스터
   - 이벤트 행사: 회색 배경 포스터
   - 고유 포스터 행사: 원본 포스터 유지

### 예상 결과
- 모든 포스터가 정상적으로 표시됨
- 이미지 로드 에러 없음
- 모바일/데스크톱 모두 정상 작동

## 관련 문서
- 요구사항: `docs/specs/icc-jeju-custom-posters/requirements.md`
- 설계: `docs/specs/icc-jeju-custom-posters/design.md`
- 태스크: `docs/specs/icc-jeju-custom-posters/tasks.md`

## 향후 유지보수

### 정기 작업 (월 1회)
```bash
cd hokex-crawler

# 1. 새로운 행사 크롤링
npx tsx scrape-icc-jeju-events.ts

# 2. bg URL 치환
npx tsx replace-icc-jeju-bg-only.ts

# 3. 상태 확인
npx tsx check-icc-jeju-poster-details.ts
```

### 포스터 이미지 변경 시
1. `hokex-front/public/images/` 폴더의 이미지 파일 교체
2. 파일명은 동일하게 유지 (`icc_jeju_*.png`)
3. Git 커밋 및 푸시 (Vercel 자동 배포)

### 문제 발생 시
1. 현재 상태 확인: `npx tsx check-icc-jeju-poster-details.ts`
2. 원본 복구: `npx tsx scrape-icc-jeju-events.ts`
3. 재치환: `npx tsx replace-icc-jeju-bg-only.ts`

## 기술 스택
- **프론트엔드**: React + TypeScript + Vite
- **배포**: Vercel
- **이미지 호스팅**: Vercel Static Files
- **크롤러**: Node.js + TypeScript + Axios + Cheerio

## 주의사항
⚠️ **고유 포스터 보호**: 
- `listimage_*.jpg` 패턴의 URL은 절대 변경하지 않음
- bg1.jpg, bg2.jpg만 정확히 매칭하여 치환
- 크롤링 시 원본 URL 그대로 저장

## 배포 완료 체크리스트
- [x] 커스텀 포스터 이미지 파일 추가
- [x] Git 커밋 및 푸시
- [x] Vercel 자동 배포 트리거
- [x] 스펙 문서 작성
- [ ] 프로덕션 환경 검증 (배포 후 2-3분 대기)
- [ ] 모바일 환경 확인
- [ ] 사용자 피드백 수집

## 배포 로그
```
[main 11519f3] feat: ICC Jeju 카테고리별 커스텀 포스터 적용
 10 files changed, 1251 insertions(+), 2 deletions(-)
 
Pushed to origin/main
Vercel deployment triggered automatically
```

## 연락처
- 개발자: AI Assistant
- 배포 담당: Vercel Auto-Deploy
- 문의: GitHub Issues
