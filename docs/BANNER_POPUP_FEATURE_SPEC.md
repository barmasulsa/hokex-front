# 배너 팝업 기능 스펙 문서

## 개요
사용자에게 중요한 공지사항이나 이벤트를 팝업 형태로 표시하는 기능입니다. 관리자가 배너를 등록하면 사용자가 홈페이지 접속 시 자동으로 팝업이 표시됩니다.

## 주요 기능

### 1. 팝업 표시 로직
- **자동 표시**: 홈페이지 로드 시 활성화된 팝업 배너가 있으면 자동으로 표시
- **하루 한 번**: 같은 배너는 하루에 한 번만 표시 (날짜 기준)
- **다시 보지 않기**: 사용자가 "다시 보지 않기"를 선택하면 해당 배너는 영구적으로 표시되지 않음
- **우선순위**: 여러 팝업이 있을 경우 첫 번째 팝업만 표시

### 2. 사용자 인터페이스

#### 팝업 모달 구성
```
┌─────────────────────────────────────┐
│  [제목]                        [×]  │
├─────────────────────────────────────┤
│                                     │
│  [HTML 콘텐츠 영역]                 │
│                                     │
├─────────────────────────────────────┤
│  [자세히 보기 →]                    │
│                                     │
│  [다시 보지 않기]  [확인]           │
└─────────────────────────────────────┘
```

#### 버튼 동작
- **× (닫기)**: 팝업을 닫고 오늘 표시 기록 저장
- **확인**: 팝업을 닫고 오늘 표시 기록 저장
- **다시 보지 않기**: 팝업을 영구적으로 숨김 처리
- **자세히 보기**: 외부 링크로 이동 (새 탭)
- **ESC 키**: 팝업 닫기

### 3. 데이터 저장 (localStorage)

#### 저장 키 구조
```typescript
// 영구 숨김 상태
`banner_popup_dismissed_${bannerId}`: {
  dismissedAt: string;  // ISO 8601 날짜
  permanent: boolean;   // true
}

// 오늘 표시 기록
`banner_popup_last_shown_${bannerId}`: string  // ISO 8601 날짜
```

#### 저장 예시
```json
{
  "banner_popup_dismissed_abc123": {
    "dismissedAt": "2026-05-31T10:30:00.000Z",
    "permanent": true
  },
  "banner_popup_last_shown_xyz789": "2026-05-31T09:15:00.000Z"
}
```

## 데이터베이스 스키마

### banners 테이블
```sql
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link_url TEXT,
  image_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('top', 'popup')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 필드 설명
- **id**: 배너 고유 ID
- **title**: 팝업 제목
- **content**: HTML 형식의 콘텐츠
- **link_url**: 자세히 보기 링크 (선택)
- **type**: 'popup' (팝업 배너)
- **is_active**: 활성화 여부
- **start_date/end_date**: 표시 기간

## 기술 구현

### 1. 컴포넌트 구조
```
HomePage
  └─ BannerPopupModal
       ├─ 제목 영역
       ├─ 콘텐츠 영역 (dangerouslySetInnerHTML)
       ├─ 자세히 보기 링크
       └─ 액션 버튼
```

### 2. 핵심 파일

#### 프론트엔드
- `src/components/BannerPopupModal.tsx`: 팝업 모달 컴포넌트
- `src/components/BannerPopupModal.css`: 팝업 스타일
- `src/utils/bannerPopupStorage.ts`: localStorage 관리 유틸리티
- `src/pages/HomePage.tsx`: 팝업 표시 로직
- `src/pages/BannerManagementPage.tsx`: 관리자 배너 관리

#### 백엔드
- `supabase-migrations/add-banner-popup-columns.sql`: 배너 테이블 마이그레이션

### 3. 주요 함수

#### bannerPopupStorage.ts
```typescript
// 배너를 영구적으로 숨김
dismissBannerForWeek(bannerId: string): void

// 배너가 숨김 상태인지 확인
isBannerDismissed(bannerId: string): boolean

// 오늘 이미 표시했는지 확인
wasShownToday(bannerId: string): boolean

// 오늘 표시했다고 기록
markAsShownToday(bannerId: string): void

// 배너 팝업 표시 여부 확인 (통합)
shouldShowBannerPopup(bannerId: string): boolean
```

## 사용자 시나리오

### 시나리오 1: 첫 방문
1. 사용자가 홈페이지 접속
2. 활성화된 팝업 배너가 있으면 자동 표시
3. localStorage에 오늘 표시 기록 저장
4. 사용자가 "확인" 클릭하여 팝업 닫기

### 시나리오 2: 같은 날 재방문
1. 사용자가 홈페이지 재접속
2. localStorage 확인: 오늘 이미 표시됨
3. 팝업 표시하지 않음

### 시나리오 3: 다음 날 방문
1. 사용자가 다음 날 홈페이지 접속
2. localStorage 확인: 어제 표시됨 (날짜 다름)
3. 팝업 다시 표시
4. 오늘 표시 기록 업데이트

### 시나리오 4: 다시 보지 않기
1. 사용자가 홈페이지 접속
2. 팝업 표시
3. 사용자가 "다시 보지 않기" 클릭
4. localStorage에 영구 숨김 상태 저장
5. 이후 방문 시 해당 배너는 표시되지 않음

## 관리자 기능

### 배너 관리 페이지
- **경로**: `/admin/banners`
- **권한**: 관리자 전용 (lcw5506@naver.com, admin@hokex.kr)

### 배너 등록/수정
1. 제목 입력
2. HTML 콘텐츠 작성
3. 링크 URL 입력 (선택)
4. 표시 기간 설정
5. 활성화 여부 선택
6. 저장

### 안내 문구
> 💡 팝업은 설정한 기간 동안 하루에 한 번 자동으로 표시됩니다. 
> 사용자가 "다시 보지 않기"를 선택하면 영구적으로 표시되지 않습니다.

## 보안 및 주의사항

### XSS 방지
- HTML 콘텐츠는 `dangerouslySetInnerHTML` 사용
- 관리자만 콘텐츠 작성 가능
- 신뢰할 수 있는 관리자만 접근 가능하도록 RLS 정책 설정

### 성능 최적화
- localStorage 사용으로 서버 부하 최소화
- 팝업 데이터는 홈페이지 로드 시 한 번만 조회
- 불필요한 리렌더링 방지

### 사용자 경험
- ESC 키로 팝업 닫기 지원
- 배경 클릭으로 팝업 닫기
- 배경 스크롤 방지
- 모바일 반응형 디자인

## 향후 개선 사항

### 기능 추가
- [ ] 팝업 표시 횟수 제한 (예: 3회까지만)
- [ ] 팝업 표시 간격 설정 (예: 3일마다)
- [ ] 사용자 그룹별 팝업 타겟팅
- [ ] A/B 테스트 기능
- [ ] 팝업 클릭률 통계

### UI/UX 개선
- [ ] 애니메이션 효과
- [ ] 다양한 팝업 템플릿
- [ ] 이미지 중심 팝업 레이아웃
- [ ] 비디오 콘텐츠 지원

### 관리 기능
- [ ] 팝업 미리보기
- [ ] 팝업 복제 기능
- [ ] 팝업 통계 대시보드
- [ ] 팝업 스케줄링

## 변경 이력

### 2026-05-31
- **변경**: "일주일간 보지 않기" → "다시 보지 않기"로 텍스트 변경
- **이유**: 사용자 혼란 방지 및 명확한 의도 전달
- **영향**: 기존 로직은 이미 영구 숨김으로 동작하고 있었으므로 텍스트만 변경

### 초기 버전
- 배너 팝업 기능 구현
- localStorage 기반 표시 제어
- 관리자 배너 관리 페이지

## 참고 문서
- [배너 관리 가이드](./BANNER_MANAGEMENT_GUIDE.md)
- [Supabase RLS 정책](../supabase-migrations/add-banner-popup-columns.sql)
- [컴포넌트 스타일 가이드](../src/components/BannerPopupModal.css)
