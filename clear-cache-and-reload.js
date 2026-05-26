// 브라우저 콘솔에서 실행하세요
// 모든 캐시를 정리하고 페이지를 새로고침합니다

console.log('🧹 캐시 정리 시작...');

// localStorage 정리
localStorage.clear();
console.log('✓ localStorage 정리 완료');

// sessionStorage 정리
sessionStorage.clear();
console.log('✓ sessionStorage 정리 완료');

// React Query 캐시 정리 (있는 경우)
if (window.queryClient) {
  window.queryClient.clear();
  console.log('✓ React Query 캐시 정리 완료');
}

console.log('✅ 모든 캐시 정리 완료!');
console.log('🔄 페이지를 새로고침합니다...');

// 페이지 새로고침
setTimeout(() => {
  location.reload();
}, 500);
