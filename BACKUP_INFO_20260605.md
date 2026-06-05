# Hokex-Front 백업 정보

## 백업 일시
- **날짜**: 2026년 6월 5일 16:38:40
- **목적**: 대규모 수정 전 안전 백업

## 백업 상태
- **커밋 해시**: `9380794`
- **커밋 메시지**: "Fix: 행사 디테일 페이지 포스터 표시 수정"
- **브랜치**: `main`
- **Git 태그**: `backup-before-major-changes-20260605-163840`

## 복원 방법

### 1. 태그로 복원 (권장)
```bash
# 특정 태그로 체크아웃
git checkout backup-before-major-changes-20260605-163840

# 새 브랜치로 복원하려면
git checkout -b restore-from-backup backup-before-major-changes-20260605-163840
```

### 2. 커밋 해시로 복원
```bash
# 특정 커밋으로 체크아웃
git checkout 9380794

# 새 브랜치로 복원하려면
git checkout -b restore-from-backup 9380794
```

### 3. main 브랜치를 이 시점으로 리셋 (주의!)
```bash
# Hard reset (작업 내용 모두 삭제)
git reset --hard backup-before-major-changes-20260605-163840

# 원격 저장소에 강제 푸시 (신중히!)
git push -f origin main
```

## 최근 작업 내역

### 완료된 작업
1. ✅ Supabase Realtime 온라인 카운터 에러 수정
2. ✅ TypeScript 빌드 에러 수정 (unused imports 제거)
3. ✅ 행사 디테일 페이지 포스터 표시 문제 해결
   - Vercel 절대 URL → 상대 경로 자동 변환
   - 베뉴별 카테고리 기반 기본 포스터 fallback 추가

### 주요 파일 상태
- `src/pages/EventDetailPage.tsx`: 포스터 표시 로직 수정됨
- `src/App.tsx`: unused imports 제거됨
- `src/components/AnalyticsStats.tsx`: unused imports 제거됨
- `src/pages/AdminAnalyticsPage.tsx`: unused imports 제거됨
- `src/utils/onlinePresence.ts`: Realtime 리스너 순서 수정됨

## 주의사항
- 이 백업은 GitHub 원격 저장소에도 푸시되어 있습니다
- 태그는 삭제하지 않는 한 영구적으로 보존됩니다
- 대규모 수정 후 문제 발생 시 이 시점으로 복원 가능합니다

## 현재 배포 상태
- Vercel 프로덕션: 자동 배포 진행 중
- 커밋 `9380794` 배포 예정
