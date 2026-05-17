# 문의 섹션 제거 가이드

## 개인정보 보호를 위한 문의 정보 비표시

### 변경 사항
- **프론트엔드**: EventDetailPage에서 모든 문의 섹션 제거
- **백엔드/크롤러**: 데이터는 그대로 유지 (DB의 contact, manager 필드는 삭제하지 않음)
- **스펙 문서**: 기능 정지 상태로 유지 (향후 복구 가능)

### 제거할 UI 요소
1. 모든 venue 레이아웃에서 "문의" detail-item 제거
2. Phone 아이콘 및 관련 텍스트 제거
3. formatContact, formatCoexContact 함수는 유지 (향후 복구 시 필요)

### 데이터 보존
- DB 테이블: `events.contact`, `events.manager` 필드 유지
- 크롤러: contact/manager 수집 로직 유지
- 스펙 문서: "⚠️ 기능 정지" 표시 추가

### 복구 방법
필요시 EventDetailPage에서 주석 처리된 문의 섹션을 다시 활성화하면 됨
