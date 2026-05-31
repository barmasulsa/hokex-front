# 배너 팝업 종료일 "종료일 없음" 기능 버그 수정

## 문제 상황

배너 관리 페이지에서 팝업 종료일을 "종료일 없음"으로 설정하고 저장한 후, 다시 해당 공지를 편집하면 이전 종료일이 다시 표시되는 문제가 발생했습니다.

### 증상
1. "종료일 설정" 체크박스를 해제하고 저장
2. 저장 후 다시 해당 공지를 편집
3. 체크박스가 다시 체크되어 있고, 이전 종료일이 표시됨

## 근본 원인

JavaScript/TypeScript에서 **`null`과 `undefined`는 다르게 동작**합니다:

### 문제가 된 코드
```typescript
const popupEndDate = formData.has_end_date && formData.popup_end_date 
  ? formData.popup_end_date 
  : null;

// 그런데 이렇게 전달하면...
popup_end_date: popupEndDate || undefined  
// null은 falsy 값이므로 || 연산자가 undefined를 반환!
```

### 왜 문제였나?
- `null || undefined` → `undefined`가 됨
- Supabase/PostgreSQL에서 `undefined`를 전달하면 → **필드를 업데이트하지 않음** (기존 값 유지)
- 그래서 DB에 종료일이 남아있었고, 다시 편집하면 그 값이 나타났던 것

## 해결 방법

### 수정된 코드
```typescript
// popup_end_date 처리: has_end_date가 false이거나 값이 없으면 명시적으로 null 전달
let popupEndDate: string | null | undefined;
if (!formData.has_end_date) {
  // 종료일 설정 체크박스가 해제되어 있으면 명시적으로 null
  popupEndDate = null;
} else if (formData.popup_end_date) {
  // 종료일이 설정되어 있으면 해당 값 사용
  popupEndDate = formData.popup_end_date;
} else {
  // 체크박스는 체크되어 있지만 날짜가 없으면 undefined (필드 업데이트 안 함)
  popupEndDate = undefined;
}

// 전달할 때도 명시적으로 처리
popup_end_date: popupEndDate === null ? null : (popupEndDate || undefined)
```

### 핵심 변경 사항
1. **명시적인 null 전달**: `has_end_date`가 false일 때 `popup_end_date`를 명시적으로 `null`로 설정
2. **타입 안전성**: `let popupEndDate: string | null | undefined`로 타입 명시
3. **조건부 로직 명확화**: if-else 구조로 각 케이스를 명확하게 처리

## 동작 흐름

### 수정 전
1. 종료일 설정 체크박스 해제 → `popup_end_date = null`
2. `popup_end_date || undefined` → `undefined` 반환
3. DB에 `undefined` 전달 → **필드 업데이트 안 됨** (기존 값 유지)
4. 다시 편집 → `has_end_date: !!banner.popup_end_date` → `true` (기존 값이 남아있음)
5. 결과: 체크박스가 체크되고 이전 날짜가 표시됨 ❌

### 수정 후
1. 종료일 설정 체크박스 해제 → `popupEndDate = null`
2. `popupEndDate === null ? null : ...` → `null` 반환
3. DB에 `null` 전달 → **필드가 null로 업데이트됨**
4. 다시 편집 → `has_end_date: !!banner.popup_end_date` → `false` (null이므로)
5. 결과: 체크박스가 해제되고 날짜 input이 표시되지 않음 ✅

## 영향 범위

### 수정된 파일
- `hokex-front/src/pages/BannerManagementPage.tsx`
  - `handleSubmit` 함수의 `popup_end_date` 처리 로직

### 관련 기능
- 배너 생성 시 팝업 종료일 설정
- 배너 수정 시 팝업 종료일 변경
- "종료일 없음" 옵션 처리

## 테스트 시나리오

### 시나리오 1: 종료일 설정 후 제거
1. 새 배너 생성
2. "팝업으로 표시" 체크
3. "종료일 설정" 체크하고 날짜 입력
4. 저장
5. 다시 편집
6. "종료일 설정" 체크 해제
7. 저장
8. 다시 편집
9. **예상 결과**: "종료일 설정" 체크박스가 해제되어 있고, 날짜 input이 표시되지 않음 ✅

### 시나리오 2: 종료일 없이 생성
1. 새 배너 생성
2. "팝업으로 표시" 체크
3. "종료일 설정" 체크 해제 (기본값)
4. 저장
5. 다시 편집
6. **예상 결과**: "종료일 설정" 체크박스가 해제되어 있음 ✅

### 시나리오 3: 종료일 변경
1. 종료일이 설정된 배너 편집
2. 다른 날짜로 변경
3. 저장
4. 다시 편집
5. **예상 결과**: 변경된 날짜가 표시됨 ✅

## 교훈

### JavaScript/TypeScript의 Falsy 값 처리
- `null`, `undefined`, `0`, `''`, `false`, `NaN`은 모두 falsy 값
- `||` 연산자는 첫 번째 truthy 값을 반환
- `null || undefined` → `undefined` (두 번째 값 반환)
- 명시적인 null 체크가 필요한 경우 `=== null` 사용

### DB 업데이트 시 주의사항
- `undefined`를 전달하면 필드가 업데이트되지 않음 (기존 값 유지)
- `null`을 전달하면 필드가 null로 업데이트됨
- 의도한 동작에 맞게 명시적으로 값을 설정해야 함

### 타입 안전성
- TypeScript의 타입 시스템을 활용하여 의도를 명확히 표현
- `string | null | undefined` 같은 유니온 타입으로 가능한 값의 범위를 명시

## 관련 이슈

- 이전 시도들:
  1. 체크박스 + `disabled` 속성 → 실패
  2. `key` prop 추가로 강제 리렌더링 → 실패
  3. `useRef` + DOM 직접 조작 → 실패
  4. 조건부 렌더링 → 실패
  5. 동적 `key` prop → 실패
  6. **최종 해결**: 명시적인 null 전달 → 성공 ✅

## 배포 체크리스트

- [x] 코드 수정 완료
- [ ] 로컬 테스트 완료
- [ ] 스테이징 환경 배포
- [ ] 스테이징 환경 테스트
- [ ] 프로덕션 배포
- [ ] 프로덕션 환경 검증
