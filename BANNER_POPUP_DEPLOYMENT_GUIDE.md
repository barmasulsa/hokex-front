# 공지사항 팝업 기능 배포 가이드

## 📋 개요

기존 배너(banners) 테이블을 확장하여 공지사항 팝업 기능을 추가했습니다.
- **하루에 한 번** 접속 시 자동 표시
- **일주일간 보지 않기** 기능
- **팝업 게시 기간** 설정 가능 (시작일~종료일)

---

## 🚀 배포 순서

### 1단계: 데이터베이스 마이그레이션

Supabase SQL Editor에서 다음 파일을 실행하세요:

**파일 경로:** `supabase-migrations/add-banner-popup-columns.sql`

```sql
-- 배너 테이블에 팝업 기능 컬럼 추가
ALTER TABLE banners
ADD COLUMN IF NOT EXISTS show_as_popup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS popup_start_date DATE,
ADD COLUMN IF NOT EXISTS popup_end_date DATE;

-- 팝업 기간 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_banners_popup_period 
ON banners(show_as_popup, popup_start_date, popup_end_date)
WHERE show_as_popup = TRUE AND is_active = TRUE;

-- 팝업 배너 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_banners_active_popup 
ON banners(type, is_active, show_as_popup)
WHERE is_active = TRUE;
```

**실행 방법:**
1. Supabase 대시보드 → SQL Editor
2. 위 SQL 복사 & 붙여넣기
3. "Run" 버튼 클릭
4. 성공 메시지 확인

---

### 2단계: 프론트엔드 배포

#### 새로 생성된 파일들:

1. **`src/utils/bannerPopupStorage.ts`**
   - localStorage 관리 유틸리티
   - 일주일간 보지 않기, 하루에 한 번 표시 로직

2. **`src/components/BannerPopupModal.tsx`**
   - 팝업 모달 컴포넌트

3. **`src/components/BannerPopupModal.css`**
   - 팝업 모달 스타일

#### 수정된 파일들:

1. **`src/pages/BannerManagementPage.tsx`**
   - 배너 생성/편집 폼에 팝업 설정 UI 추가
   - `formData` state에 팝업 필드 추가

2. **`src/pages/HomePage.tsx`**
   - 팝업 배너 로드 및 표시 로직 추가
   - `BannerPopupModal` 컴포넌트 렌더링

#### 배포 명령어:

```bash
# 프론트엔드 빌드
cd hokex-front
npm run build

# Vercel 배포 (자동 배포 설정된 경우 git push만 하면 됨)
git add .
git commit -m "feat: 공지사항 팝업 기능 추가"
git push origin main
```

---

## 🎯 사용 방법

### 관리자 페이지에서 팝업 배너 생성

1. **관리자 페이지 접속**
   - `/banner-management` 경로

2. **"공지사항" 탭 선택**

3. **"+ 공지사항 추가" 버튼 클릭**

4. **팝업 설정**
   - ✅ **"팝업으로 표시"** 체크박스 활성화
   - 📅 **팝업 시작일** 입력 (예: 2026-06-01)
   - 📅 **팝업 종료일** 입력 (예: 2026-06-07)

5. **공지사항 내용 작성**
   - 제목 입력
   - 내용 입력 (Rich Text Editor 사용 가능)
   - 링크 URL (선택사항)

6. **"생성" 버튼 클릭**

---

## 📊 동작 방식

### 팝업 표시 조건

팝업은 다음 **모든 조건**을 만족할 때만 표시됩니다:

1. ✅ `type = 'text'` (공지사항 타입)
2. ✅ `is_active = true` (활성화 상태)
3. ✅ `show_as_popup = true` (팝업으로 표시 설정)
4. ✅ 오늘 날짜가 `popup_start_date` ~ `popup_end_date` 범위 내
5. ✅ 사용자가 "일주일간 보지 않기"를 선택하지 않음
6. ✅ 오늘 아직 표시되지 않음 (하루에 한 번만)

### localStorage 저장 데이터

```javascript
// 일주일간 보지 않기
banner_popup_dismissed_{bannerId}: {
  dismissedAt: "2026-05-31T10:00:00.000Z",
  expiresAt: "2026-06-07T10:00:00.000Z"
}

// 오늘 표시 여부
banner_popup_last_shown_{bannerId}: "2026-05-31T10:00:00.000Z"
```

---

## 🧪 테스트 방법

### 1. 팝업 배너 생성 테스트

```
1. 관리자 페이지 → 공지사항 탭
2. 새 공지사항 추가
3. "팝업으로 표시" 체크
4. 오늘 날짜로 시작일/종료일 설정
5. 저장
```

### 2. 홈페이지에서 팝업 확인

```
1. 홈페이지 새로고침
2. 팝업이 자동으로 표시되는지 확인
3. "확인" 버튼 클릭 → 팝업 닫힘
4. 다시 새로고침 → 팝업이 표시되지 않음 (오늘 이미 표시됨)
```

### 3. "일주일간 보지 않기" 테스트

```
1. 홈페이지 새로고침
2. 팝업 표시
3. "일주일간 보지 않기" 버튼 클릭
4. localStorage 확인:
   - 개발자 도구 → Application → Local Storage
   - banner_popup_dismissed_{bannerId} 키 확인
5. 다시 새로고침 → 팝업이 표시되지 않음
```

### 4. localStorage 초기화 (테스트용)

```javascript
// 브라우저 콘솔에서 실행
import { clearAllBannerPopupData } from './utils/bannerPopupStorage';
clearAllBannerPopupData();
```

또는 수동으로:

```javascript
// 브라우저 콘솔에서 실행
Object.keys(localStorage)
  .filter(key => key.startsWith('banner_popup_'))
  .forEach(key => localStorage.removeItem(key));
```

---

## 🔍 문제 해결

### 팝업이 표시되지 않는 경우

1. **데이터베이스 확인**
   ```sql
   SELECT id, title, type, is_active, show_as_popup, 
          popup_start_date, popup_end_date
   FROM banners
   WHERE type = 'text' AND show_as_popup = TRUE;
   ```

2. **날짜 범위 확인**
   - 오늘 날짜가 `popup_start_date` ~ `popup_end_date` 범위 내인지 확인

3. **localStorage 확인**
   - 개발자 도구 → Application → Local Storage
   - `banner_popup_dismissed_{bannerId}` 키가 있는지 확인
   - 있다면 삭제 후 다시 테스트

4. **브라우저 콘솔 확인**
   - 에러 메시지가 있는지 확인
   - `Failed to load popup banner` 메시지 확인

### 팝업이 계속 표시되는 경우

1. **localStorage 저장 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   console.log(localStorage.getItem('banner_popup_last_shown_{bannerId}'));
   ```

2. **날짜 비교 로직 확인**
   - `wasShownToday()` 함수가 올바르게 동작하는지 확인

---

## 📝 주의사항

1. **알림(announcements) 기능과 별개**
   - 알림: 사이트 내부 알림 시스템 (🔔 알림 관리 탭)
   - 팝업: 공지사항 배너의 팝업 기능 (공지사항 탭)

2. **여러 팝업 배너가 있는 경우**
   - 현재는 첫 번째 팝업 배너만 표시됨
   - 필요시 우선순위 로직 추가 가능

3. **팝업 기간 설정**
   - 시작일과 종료일을 모두 설정해야 함
   - 날짜 범위를 벗어나면 자동으로 표시되지 않음

4. **성능 최적화**
   - 인덱스가 생성되어 있어 조회 성능 최적화됨
   - localStorage 사용으로 서버 부하 최소화

---

## 🎉 완료!

모든 단계를 완료하면 공지사항 팝업 기능이 정상적으로 작동합니다.

문제가 발생하면 위의 "문제 해결" 섹션을 참고하세요.
