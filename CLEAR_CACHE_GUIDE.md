# LocalStorage 캐시 삭제 가이드

## 문제 상황
- 정렬 로직 코드는 정확하지만 화면에 반영되지 않음
- 강제 새로고침(Ctrl+Shift+R)해도 변경 안됨
- **원인**: LocalStorage에 캐시된 이전 데이터가 사용되고 있음

## 해결 방법

### 방법 1: 개발자 도구에서 캐시 삭제 (권장)

1. **F12** 키를 눌러 개발자 도구 열기
2. **Application** 탭 클릭 (또는 **저장소** 탭)
3. 왼쪽 메뉴에서 **Local Storage** 확장
4. `http://localhost:5173` 클릭
5. 오른쪽에서 `events_cache` 항목 찾기
6. **우클릭 → Delete** 또는 **X 버튼** 클릭
7. 페이지 새로고침 (F5)

### 방법 2: 콘솔에서 직접 삭제

1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭 클릭
3. 다음 명령어 입력 후 Enter:
```javascript
localStorage.removeItem('events_cache')
location.reload()
```

### 방법 3: 모든 LocalStorage 삭제

```javascript
localStorage.clear()
location.reload()
```

## 확인 방법

캐시 삭제 후 콘솔에서 다음 로그 확인:
- `[Cache] No cache found` - 캐시가 없어서 새로 가져옴
- `[Cache] Cache expired` - 캐시가 만료되어 새로 가져옴
- `[Cache] Hit for all events` - 캐시 사용 (이 경우 다시 삭제 필요)

## 정렬 순서 확인

캐시 삭제 후 다음 순서로 정렬되어야 함:

**5월 27일 행사 예시:**
1. **5월 27일 단일 행사** (대전컨벤션센터) ← 먼저
2. 5월 27일~29일 기간 행사 (벡스코) ← 나중

**같은 시작일 + 같은 기간:**
- 지역 우선순위: 서울 → 수도권 → 충청도 → 전라도 → 강원도 → 경상도 → 제주도
- 같은 지역 내: 전시장 우선순위 (코엑스 → 킨텍스 → 벡스코 등)

## 캐시 TTL 정보
- 캐시 유효 시간: **5분**
- 5분 후 자동으로 새 데이터 가져옴
