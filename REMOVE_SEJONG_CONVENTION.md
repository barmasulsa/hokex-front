# 세종컨벤션센터 제거 가이드

## 문제 상황
- 로컬 코드에서는 세종컨벤션센터가 제거됨
- 변경사항이 커밋되지 않음
- Vercel 배포 버전에는 여전히 세종컨벤션센터가 표시됨

## 해결 방법

### 1. 변경사항 확인
```bash
cd hokex-front
git diff src/types/core.ts
```

### 2. 변경사항 커밋
```bash
git add src/types/core.ts
git commit -m "fix: Remove 세종컨벤션센터 from venue list"
```

### 3. 원격 저장소에 푸시
```bash
git push origin main
```

### 4. Vercel 자동 배포 확인
- Vercel은 main 브랜치에 푸시하면 자동으로 배포됩니다
- Vercel 대시보드에서 배포 상태 확인: https://vercel.com/dashboard
- 배포 완료 후 2-3분 정도 기다리면 반영됩니다

### 5. 브라우저 캐시 삭제
배포 완료 후:
- Windows: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

## 현재 상태

### 로컬 파일 (src/types/core.ts)
```typescript
[Region.Chungcheong]: ["대전컨벤션센터", "청주오스코"],  // ✅ 세종컨벤션센터 제거됨
```

### Git 상태
```
Changes not staged for commit:
  modified:   src/types/core.ts
```

### Vercel 배포 버전
```
[Region.Chungcheong]: ["대전컨벤션센터", "세종컨벤션센터", "청주오스코"]  // ❌ 아직 포함됨
```

## 참고
- 세종컨벤션센터는 데이터베이스에도 없고, venues.ts에도 없습니다
- 프론트엔드 타입 정의에서만 제거하면 됩니다
