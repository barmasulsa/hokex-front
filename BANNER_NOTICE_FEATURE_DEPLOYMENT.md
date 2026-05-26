# 공지사항 기능 업데이트 배포 가이드

## 📋 업데이트 내용

### 1. URL 링크 기능 추가
- **제목 링크**: 공지사항 제목에 URL을 연결하여 클릭 시 해당 페이지로 바로 이동
- **내용 링크**: 공지사항 내용에 포함된 URL을 자동으로 클릭 가능한 링크로 변환
- **링크 URL 필드**: 별도의 `link_url` 필드로 관리하여 제목과 링크를 독립적으로 설정

### 2. 리치 텍스트 에디터 기능
- **텍스트 서식**: 굵게, 기울임, 밑줄, 취소선
- **텍스트 색상**: 자유로운 색상 선택
- **정렬**: 왼쪽, 가운데, 오른쪽 정렬
- **리스트**: 글머리 기호, 번호 매기기
- **이미지 삽입**: PNG, JPG 등 이미지 파일 업로드 (최대 2MB)
- **링크 삽입**: 텍스트에 하이퍼링크 추가
- **서식 제거**: 모든 서식 제거 기능

## 🚀 배포 절차

### 1. 빌드 확인
```bash
cd hokex-front
npm run build
```

**빌드 결과:**
- ✅ TypeScript 컴파일 성공
- ✅ Vite 빌드 성공
- ✅ 번들 크기: 593.84 kB (gzip: 163.99 kB)
- ✅ CSS 크기: 62.98 kB (gzip: 11.54 kB)

### 2. Vercel 배포
```bash
# Vercel CLI를 사용하는 경우
vercel --prod

# 또는 Git push를 통한 자동 배포
git add .
git commit -m "feat: 공지사항 URL 링크 및 리치 텍스트 에디터 기능 추가"
git push origin main
```

### 3. 배포 확인 사항
- [ ] 공지사항 생성 시 링크 URL 입력 필드 표시 확인
- [ ] 링크 URL이 있는 공지사항 클릭 시 새 탭에서 열림 확인
- [ ] 링크 URL이 없는 공지사항 클릭 시 모달 표시 확인
- [ ] 리치 텍스트 에디터 툴바 정상 작동 확인
- [ ] 텍스트 서식(굵게, 기울임, 밑줄 등) 적용 확인
- [ ] 이미지 업로드 및 표시 확인
- [ ] 공지사항 모달에서 HTML 콘텐츠 정상 렌더링 확인

## 📁 변경된 파일

### 새로 생성된 파일
1. **`src/components/RichTextEditor.tsx`**
   - 커스텀 리치 텍스트 에디터 컴포넌트
   - contentEditable 기반 구현
   - 이미지 Base64 변환 및 삽입

2. **`src/components/RichTextEditor.css`**
   - 리치 텍스트 에디터 스타일
   - 툴바 버튼 디자인
   - 에디터 영역 스타일

### 수정된 파일
1. **`src/pages/BannerManagementPage.tsx`**
   - text 타입 배너 폼에 링크 URL 입력 필드 추가
   - textarea를 RichTextEditor 컴포넌트로 교체
   - 링크 URL 빈 문자열 처리 로직 추가

2. **`src/components/Banner.tsx`**
   - `handleNoticeClick` 함수 추가: link_url 유무에 따라 동작 분기
   - HTML 콘텐츠 렌더링을 위한 `dangerouslySetInnerHTML` 사용
   - XSS 방어를 위한 `sanitizeHTML` 함수 추가

3. **`src/components/Banner.css`**
   - 모달 내 HTML 콘텐츠 스타일 추가
   - 이미지, 링크, 리스트 등 서식 스타일

4. **`src/services/bannerService.ts`**
   - `createBanner`와 `updateBanner`에서 빈 문자열 처리 개선

## 🔧 기술 세부사항

### URL 링크 기능
```typescript
// 링크 URL이 있으면 바로 이동, 없으면 모달 열기
const handleNoticeClick = async (banner: BannerType) => {
  if (banner.link_url) {
    await supabase.rpc('increment_banner_view_count', { banner_id: banner.id });
    window.open(banner.link_url, '_blank', 'noopener,noreferrer');
  } else {
    openModal(banner);
  }
};
```

### 리치 텍스트 에디터
- **구현 방식**: `contentEditable` + `document.execCommand`
- **이미지 처리**: FileReader API로 Base64 변환
- **XSS 방어**: script, iframe, object, embed 태그 및 on* 이벤트 속성 제거

### 데이터베이스 스키마
```sql
-- banners 테이블
link_url TEXT NULL  -- 공지사항 링크 URL (선택 사항)
```

## 🎯 사용 방법

### 관리자 모드에서 공지사항 생성
1. 관리자 페이지 접속
2. "공지사항" 탭 선택
3. "새 공지사항 추가" 버튼 클릭
4. 제목 입력
5. 리치 텍스트 에디터로 내용 작성
   - 툴바에서 원하는 서식 선택
   - 이미지 버튼으로 이미지 삽입
   - 링크 버튼으로 텍스트에 링크 추가
6. (선택) 링크 URL 입력 - 제목 클릭 시 이동할 URL
7. "생성" 버튼 클릭

### 사용자 화면에서 공지사항 확인
- **링크 URL이 있는 경우**: 공지사항 클릭 시 새 탭에서 해당 페이지 열림
- **링크 URL이 없는 경우**: 공지사항 클릭 시 모달로 전체 내용 표시

## ⚠️ 주의사항

### 이미지 업로드
- 최대 파일 크기: 2MB
- 지원 형식: PNG, JPG, GIF, WebP 등 모든 이미지 형식
- Base64로 변환되어 데이터베이스에 저장됨

### 보안
- HTML 콘텐츠 렌더링 시 XSS 공격 방어를 위한 sanitize 처리
- 위험한 태그(script, iframe 등) 자동 제거
- 이벤트 핸들러 속성(onclick 등) 자동 제거

### 성능
- 이미지가 많거나 큰 경우 로딩 시간 증가 가능
- 가능한 한 이미지 크기를 최적화하여 사용 권장

## 📊 배포 후 모니터링

### 확인 항목
1. **기능 테스트**
   - [ ] 공지사항 생성/수정/삭제
   - [ ] 링크 URL 동작
   - [ ] 리치 텍스트 서식 표시
   - [ ] 이미지 표시

2. **성능 모니터링**
   - [ ] 페이지 로딩 속도
   - [ ] 이미지 로딩 시간
   - [ ] 모달 열기/닫기 반응 속도

3. **사용자 피드백**
   - [ ] 에디터 사용성
   - [ ] 모바일 환경 호환성
   - [ ] 브라우저 호환성

## 🐛 알려진 이슈 및 해결 방법

### React Quill 호환성 문제
- **문제**: React 19와 React Quill 호환성 이슈
- **해결**: contentEditable 기반 커스텀 에디터로 대체

### TypeScript 타입 에러
- **문제**: `link_url` 타입 불일치 (null vs undefined)
- **해결**: `undefined`로 통일하여 타입 호환성 확보

## 📝 롤백 절차

문제 발생 시 이전 버전으로 롤백:

```bash
# Git을 통한 롤백
git revert HEAD
git push origin main

# 또는 Vercel 대시보드에서 이전 배포 버전으로 롤백
```

## 🎉 배포 완료 체크리스트

- [x] 빌드 성공
- [ ] Vercel 배포 완료
- [ ] 프로덕션 환경 테스트
- [ ] 공지사항 생성 테스트
- [ ] 링크 URL 기능 테스트
- [ ] 리치 텍스트 에디터 테스트
- [ ] 모바일 환경 테스트
- [ ] 스펙 문서 작성 완료

---

**배포 일시**: 2026-05-27  
**배포자**: 관리자  
**버전**: v1.2.0 - 공지사항 URL 링크 및 리치 텍스트 에디터 기능 추가
