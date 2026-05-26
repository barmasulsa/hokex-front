// 브라우저 콘솔에서 실행할 스크립트
// 필터 상태를 초기화하고 페이지를 새로고침합니다

console.log('=== 필터 상태 초기화 시작 ===');

// 1. 현재 필터 상태 확인
const currentState = sessionStorage.getItem('homeFilterState');
console.log('현재 필터 상태:', currentState);

if (currentState) {
  try {
    const parsed = JSON.parse(currentState);
    console.log('파싱된 필터 상태:', parsed);
  } catch (e) {
    console.error('필터 상태 파싱 실패:', e);
  }
}

// 2. sessionStorage 초기화
sessionStorage.removeItem('homeFilterState');
console.log('✓ sessionStorage 필터 상태 삭제됨');

// 3. localStorage도 확인 (혹시 모를 캐시)
console.log('localStorage 키 목록:', Object.keys(localStorage));

// 4. React Query 캐시 확인 (있다면)
if (window.__REACT_QUERY_DEVTOOLS__) {
  console.log('React Query DevTools 감지됨');
}

// 5. 페이지 새로고침
console.log('=== 3초 후 페이지 새로고침 ===');
setTimeout(() => {
  location.reload();
}, 3000);
