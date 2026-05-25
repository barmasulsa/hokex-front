import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmhxnxnaawtjelqlgyig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwOTgyNDUsImV4cCI6MjA5MjY3NDI0NX0.OIv8lNoOGzunHcFFCIYu7zvBKri5JYY7uQB8ysHI3Mk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViewCount() {
  console.log('=== 조회수 테스트 시작 ===\n');

  // 1. 모든 공지사항 배너 확인
  const { data: banners, error: bannerError } = await supabase
    .from('banners')
    .select('*')
    .eq('type', 'text')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (bannerError) {
    console.error('배너 조회 실패:', bannerError);
    return;
  }

  console.log(`활성 공지사항 배너: ${banners?.length}개\n`);
  
  // 모든 배너 출력
  banners?.forEach((banner, index) => {
    console.log(`${index + 1}. ${banner.title}`);
    console.log(`   링크: ${banner.link_url || '없음'}`);
  });

  // 링크가 있는 배너 찾기
  const bannerWithLink = banners?.find(b => b.link_url && b.link_url.includes('/event/'));
  
  if (!bannerWithLink) {
    console.log('\n행사 링크가 있는 공지사항이 없습니다.');
    console.log('임의의 행사로 테스트를 진행합니다...\n');
    
    // 임의의 행사 하나 가져오기
    const { data: randomEvent, error: randomError } = await supabase
      .from('events')
      .select('id, title, view_count')
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (randomError || !randomEvent) {
      console.error('행사 조회 실패:', randomError);
      return;
    }

    await testEventViewCount(randomEvent.id, randomEvent.title, randomEvent.view_count);
    return;
  }

  // 2. 링크에서 event ID 추출
  const linkUrl = bannerWithLink.link_url;
  const eventIdMatch = linkUrl?.match(/\/event\/([a-f0-9-]+)/);
  
  if (!eventIdMatch) {
    console.log('링크에서 event ID를 찾을 수 없습니다:', linkUrl);
    return;
  }

  const eventId = eventIdMatch[1];
  console.log(`\n선택된 배너: ${bannerWithLink.title}`);
  console.log(`추출된 Event ID: ${eventId}`);

  // 3. 행사 정보 가져오기
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, view_count')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error('행사 조회 실패:', eventError);
    return;
  }

  await testEventViewCount(event.id, event.title, event.view_count);
}

async function testEventViewCount(eventId: string, title: string, currentViewCount: number) {
  console.log(`\n현재 상태:`);
  console.log(`- 행사명: ${title}`);
  console.log(`- 현재 조회수: ${currentViewCount || 0}`);

  // RPC 함수로 조회수 증가 테스트
  console.log(`\n조회수 +5 증가 테스트...`);
  const { data: rpcData, error: rpcError } = await supabase.rpc('increment_view_count', {
    event_id: eventId,
    increment_by: 5
  });

  if (rpcError) {
    console.error('RPC 호출 실패:', rpcError);
    return;
  }

  console.log('RPC 호출 성공');

  // 업데이트된 조회수 확인
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

  const { data: afterEvent, error: afterError } = await supabase
    .from('events')
    .select('id, title, view_count')
    .eq('id', eventId)
    .single();

  if (afterError) {
    console.error('업데이트 후 조회 실패:', afterError);
    return;
  }

  console.log(`\n업데이트 후 상태:`);
  console.log(`- 행사명: ${afterEvent.title}`);
  console.log(`- 업데이트된 조회수: ${afterEvent.view_count || 0}`);
  console.log(`- 증가량: ${(afterEvent.view_count || 0) - (currentViewCount || 0)}`);

  if ((afterEvent.view_count || 0) > (currentViewCount || 0)) {
    console.log('\n✅ 조회수가 정상적으로 증가했습니다!');
  } else {
    console.log('\n❌ 조회수가 증가하지 않았습니다.');
  }

  console.log('\n=== 테스트 완료 ===');
}

testViewCount().catch(console.error);
