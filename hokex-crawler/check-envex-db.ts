/**
 * 데이터베이스의 제47회 국제환경산업기술&그린에너지전 정보 확인
 */

import { SupabaseService } from './src/services/supabase';

async function checkEnvexDB() {
  console.log('=== 데이터베이스 정보 확인 ===\n');

  const supabase = new SupabaseService();

  try {
    const { data: events, error } = await (supabase as any).client
      .from('events')
      .select('*')
      .ilike('title', '%국제환경산업기술%')
      .eq('venue', '코엑스');

    if (error) {
      console.error('❌ 검색 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  행사를 찾을 수 없습니다.');
      return;
    }

    const event = events[0];

    console.log('📋 데이터베이스 정보:\n');
    console.log(`제목: ${event.title}`);
    console.log(`\n주최: ${event.organizer || '없음'}`);
    console.log(`\n주관: ${event.supervisor || '없음'}`);
    console.log(`\n전시품목: ${event.exhibit_items || '없음'}`);
    console.log(`\n전시제품: ${event.exhibit_products || '없음'}`);
    console.log(`\n행사 소개: ${event.description ? event.description.substring(0, 100) + '...' : '없음'}`);
    console.log(`\n입장료: ${event.admission_fee || '없음'}`);
    console.log(`\n담당자: ${event.contact || '없음'}`);
    console.log(`\n운영시간: ${event.operating_hours || '없음'}`);
    console.log(`\n관람장소: ${event.venue_hall || '없음'}`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkEnvexDB();
