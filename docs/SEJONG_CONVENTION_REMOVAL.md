# 세종컨벤션센터 제거 해결 문서

## 문제 상황

사용자가 프론트엔드에서 세종컨벤션센터가 여전히 표시된다고 보고했습니다.

### 초기 조사 결과
- ✅ 데이터베이스: 세종컨벤션센터 행사 없음
- ✅ 백엔드 venues.ts: 세종컨벤션센터 설정 없음
- ✅ 로컬 코드: `src/types/core.ts`에서 세종컨벤션센터 제거됨
- ❌ Vercel 배포: 여전히 세종컨벤션센터 표시됨

## 근본 원인

Vercel 배포가 실패하여 최신 코드가 반영되지 않았습니다.

### 배포 실패 원인

TypeScript 빌드 에러로 인한 배포 실패:

```
src/pages/EventDetailPage.tsx(16,20): error TS6133: 'setImgError' is declared but its value is never read.
src/services/eventService.ts(5,7): error TS6133: 'PLACEHOLDER_IMAGE' is declared but its value is never read.
```

### 문제 발생 과정

1. 로컬에서 `src/types/core.ts` 수정 (세종컨벤션센터 제거)
2. 해당 변경사항만 커밋 및 푸시
3. Vercel 자동 배포 트리거
4. **빌드 중 TypeScript 에러 발생** (사용하지 않는 변수)
5. 배포 실패 → 이전 버전 계속 서빙
6. 사용자는 브라우저 캐시 삭제 및 시크릿 모드 사용했지만 변화 없음

## 해결 방법

### 1단계: 문제 진단

```bash
# Vercel 대시보드에서 배포 로그 확인
# 최근 3개 배포 모두 "Error" 상태 확인
```

### 2단계: 로컬 빌드 테스트

```bash
cd hokex-front
npm run build
# ✅ 로컬에서는 성공 → Vercel이 오래된 코드 빌드 중
```

### 3단계: Git 상태 확인

```bash
git status
# 발견: EventDetailPage.tsx와 eventService.ts에 커밋되지 않은 변경사항
```

### 4단계: 변경사항 확인

**EventDetailPage.tsx:**
```diff
- const [imgError, setImgError] = useState(false);
  
- if (imgError || !event.poster) {
+ if (!event.poster) {
```

**eventService.ts:**
```diff
- // Placeholder 이미지 URL
- const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=No+Poster';
-
  // Supabase 데이터를 EventRecord 타입으로 변환
```

### 5단계: 수정 및 배포

```bash
# 사용하지 않는 변수 제거한 파일 커밋
git add src/pages/EventDetailPage.tsx src/services/eventService.ts
git commit -m "fix: Remove unused variables causing build errors"
git push origin main
```

### 6단계: 배포 확인

- Vercel이 자동으로 새 배포 시작
- 빌드 성공 ✅
- 세종컨벤션센터 제거된 버전 배포 완료 ✅

## 커밋 히스토리

1. `3132ee7` - fix: Remove 세종컨벤션센터 from venue list (배포 실패)
2. `5fe69b8` - fix: Remove unused variables causing build errors (배포 성공)

## 교훈

### 문제점
1. **부분 커밋**: 타입 정의만 수정하고 관련 코드 정리를 커밋하지 않음
2. **로컬 테스트 부족**: 푸시 전 `npm run build` 실행하지 않음
3. **배포 모니터링 부족**: Vercel 배포 상태를 즉시 확인하지 않음

### 개선 방안
1. **푸시 전 빌드 테스트**: 항상 `npm run build`로 로컬 빌드 확인
2. **완전한 커밋**: 관련된 모든 변경사항을 함께 커밋
3. **배포 모니터링**: 푸시 후 Vercel 대시보드에서 배포 상태 확인
4. **Pre-commit Hook 고려**: TypeScript 에러를 커밋 전에 자동 검사

## 참고 파일

- `hokex-front/src/types/core.ts` - Venue 타입 정의
- `hokex-front/src/pages/EventDetailPage.tsx` - 이벤트 상세 페이지
- `hokex-front/src/services/eventService.ts` - 이벤트 서비스
- `hokex-front/REMOVE_SEJONG_CONVENTION.md` - 초기 트러블슈팅 가이드

## 최종 결과

✅ 세종컨벤션센터가 프론트엔드에서 완전히 제거됨  
✅ Vercel 배포 성공  
✅ 사용자 확인 완료
