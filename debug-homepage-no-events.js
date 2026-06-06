// 브라우저 콘솔에 이 코드를 붙여넣으세요
// (F12 → Console 탭 → "allow pasting" 입력 → 이 코드 붙여넣기)

console.log('=== 홈페이지 행사 없음 디버깅 시작 ===');

// 1. localStorage 캐시 확인
console.log('\n[1] localStorage 캐시 확인:');
const cachedEvents = localStorage.getItem('events:all');
if (cachedEvents) {
  try {
    const parsed = JSON.parse(cachedEvents);
    console.log('✓ 캐시 있음:', {
      dataLength: parsed.data?.length || 0,
      timestamp: new Date(parsed.timestamp).toLocaleString(),
      ttl: `${parsed.ttl / 1000}초`,
      expired: Date.now() - parsed.timestamp > parsed.ttl ? '만료됨' : '유효함'
    });
  } catch (e) {
    console.log('✗ 캐시 파싱 실패:', e);
  }
} else {
  console.log('✗ 캐시 없음');
}

// 2. React 상태 확인
console.log('\n[2] React 상태 확인:');
const reactRoot = document.querySelector('#root');
if (reactRoot) {
  const reactFiber = Object.keys(reactRoot).find(key => key.startsWith('__react'));
  if (reactFiber) {
    const fiber = reactRoot[reactFiber];
    console.log('✓ React 앱 발견');
    
    // HomePage 컴포넌트 찾기
    function findHomePageComponent(node, depth = 0) {
      if (depth > 20) return null;
      
      if (node?.memoizedState || node?.memoizedProps) {
        // events 상태 찾기
        let current = node.memoizedState;
        while (current) {
          if (Array.isArray(current.memoizedState)) {
            const arr = current.memoizedState;
            if (arr.length > 0 && arr[0]?.id && arr[0]?.title) {
              return { events: arr, component: node };
            }
          }
          current = current.next;
        }
      }
      
      if (node?.child) {
        const result = findHomePageComponent(node.child, depth + 1);
        if (result) return result;
      }
      
      if (node?.sibling) {
        const result = findHomePageComponent(node.sibling, depth + 1);
        if (result) return result;
      }
      
      return null;
    }
    
    const homePageData = findHomePageComponent(fiber);
    if (homePageData) {
      console.log('✓ HomePage 컴포넌트 발견');
      console.log('  - events 배열 길이:', homePageData.events.length);
      if (homePageData.events.length > 0) {
        console.log('  - 첫 번째 행사:', {
          title: homePageData.events[0].title,
          venue: homePageData.events[0].venue,
          region: homePageData.events[0].region
        });
      }
    } else {
      console.log('✗ HomePage 컴포넌트 못 찾음');
    }
  }
}

// 3. Supabase 연결 직접 테스트
console.log('\n[3] Supabase 직접 쿼리 테스트:');
console.log('(이 부분은 Supabase 클라이언트가 필요합니다)');

// window에서 supabase 클라이언트 찾기
let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase;
} else {
  // React 컴포넌트에서 찾기
  const allScripts = Array.from(document.querySelectorAll('script'));
  console.log('Supabase 클라이언트를 찾을 수 없습니다.');
  console.log('대신 아래 코드를 직접 실행하세요:');
  console.log(`
// Supabase 쿼리 테스트
import { supabase } from './lib/supabase';
const { data, error } = await supabase.from('events').select('*').is('deleted_at', null).limit(5);
console.log('데이터:', data?.length, '개');
console.log('에러:', error);
  `);
}

// 4. 네트워크 요청 확인
console.log('\n[4] 네트워크 요청 확인:');
console.log('브라우저 개발자 도구에서:');
console.log('  1. Network 탭 열기');
console.log('  2. 필터에서 "Fetch/XHR" 선택');
console.log('  3. 페이지 새로고침 (Ctrl+R)');
console.log('  4. "events" 라는 요청 찾기');
console.log('  5. Response 탭에서 데이터 확인');

// 5. localStorage 캐시 삭제 및 새로고침 제안
console.log('\n[5] 해결 방법:');
console.log('다음 명령어를 실행하고 페이지를 새로고침하세요:');
console.log('\nlocalStorage.removeItem("events:all");');
console.log('location.reload();');

console.log('\n=== 디버깅 완료 ===');
