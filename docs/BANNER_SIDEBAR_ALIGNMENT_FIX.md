# 배너-사이드바 상단 정렬 수정

## 문제 상황

배너 이미지의 상단 테두리와 사이드바의 상단 테두리가 정확히 정렬되지 않는 문제가 발생했습니다.

### 초기 상태
- 배너 이미지가 사이드바보다 낮은 위치에 표시됨
- 사이드바는 `position: sticky; top: 100px`로 고정
- 배너는 일반 flow에 따라 배치되어 정렬이 맞지 않음

## 해결 방법

### 핵심 아이디어
사이드바의 `top: 100px` 값을 배너에도 적용하되, `position: sticky`는 사용하지 않고 `margin-top`으로 위치를 조정합니다.

### 계산 로직
```
배너 margin-top = 사이드바 top - wrapper padding-top
                = 100px - 15px
                = 85px
```

### 레이아웃 구조
```
.main-content-wrapper
├── padding: 15px 2rem 2rem 2rem (상단만 15px)
├── .filter-sidebar
│   ├── position: sticky
│   ├── top: 100px
│   └── padding: 1.5rem (24px)
└── .main-content-area
    └── .banner-sections
        ├── margin: 85px 0 15px 0
        └── .banner-section (첫 번째 배너)
            └── border: 2px solid #5b7fc7
```

## 구현 내용

### 1. 배너 컨테이너 위치 조정
**파일**: `hokex-front/src/components/Banner.css`

```css
.banner-sections {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 85px 0 15px 0; /* 사이드바 top: 100px에 맞추기 위해 85px */
  padding: 0;
}
```

### 2. 이미지 배너 높이 조정
```css
.image-section {
  min-height: 200px;
  max-height: 500px;
  padding: 0;
}

.banner-image {
  width: 100%;
  height: 100%;
  min-height: 200px;
  max-height: 500px;
  object-fit: cover;
  display: block;
}
```

## 시도한 방법들 (실패)

1. **`margin-top: 1.5rem`** → 내부 콘텐츠와 맞춰짐 (테두리가 아님)
2. **`margin: -2px 0 0 0`** → 여전히 안 맞음
3. **`padding: 24px 0 0 0`** → 내부 콘텐츠와 맞춰짐
4. **`.banner-section:first-child { margin-top: -2px }`** → 효과 없음
5. **`position: sticky; top: 100px`** → 높이는 맞았지만 스크롤 시 사이드바 위에 겹침
6. **negative margin 사용** → 헤더 아래로 들어가는 문제 발생
7. **사이드바 패딩 조정** → 사용자가 "사이드바는 건들지 말라"고 명시

## 최종 결과

### 성공 요인
- **정확한 계산**: wrapper의 padding-top을 고려한 정확한 margin 값 적용
- **sticky 미사용**: 스크롤 시 겹침 현상 방지
- **테두리 기준 정렬**: 내부 콘텐츠가 아닌 박스 테두리를 기준으로 정렬

### 확인 사항
✅ 배너 상단 테두리와 사이드바 상단 테두리가 정확히 같은 높이  
✅ 스크롤 시 배너가 사이드바 위에 겹치지 않음  
✅ 헤더와 배너 사이 간격 15px 유지  
✅ 배너 간 간격 15px 유지  
✅ 배너와 결과 카운트 배너 사이 간격 15px 유지  

## 커밋 히스토리

1. `배너 상단 위치를 사이드바와 정렬 (margin-top: 85px)` - 위치 정렬
2. `이미지 배너 높이를 500px로 증가` - 높이 조정

## 관련 파일

- `hokex-front/src/components/Banner.css` - 배너 스타일
- `hokex-front/src/App.css` - 메인 레이아웃 (wrapper, sidebar)
- `hokex-front/src/pages/HomePage.tsx` - 배너와 사이드바 배치 구조

## 참고 사항

- 브라우저 캐시 문제로 변경사항이 즉시 반영되지 않을 수 있음
- 하드 리프레시(Ctrl+Shift+R) 필요
- 개발 서버 재시작 권장
