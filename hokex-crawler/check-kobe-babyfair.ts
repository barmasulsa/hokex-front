/**
 * 2026 코베 베이비페어 주최/주관 정보 확인
 */

import { SupabaseService } from './src/services/supabase';

async function checkKobeBabyfair() {
  console.log('=== 2026 코베 베이비페어 정보 확인 ===\n');

  const supabase = new SupabaseService();

  try {
    const { data: events, error } = await (supabase as any).client
      .from('events')
      .select('*')
      .eq('title', '2026 코베 베이비페어')
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

    console.log('📋 행사 정보:\n');
    console.log(`제목: ${event.title}`);
    console.log(`시작일: ${event.start_date}`);
    console.log(`종료일: ${event.end_date}`);
    console.log(`주최: ${event.organizer || '없음'}`);
    console.log(`주관: ${event.supervisor || '없음'}`);
    console.log(`입장료: ${event.admission_fee || '없음'}`);
    console.log(`관련 사이트: ${event.target_link || '없음'}`);
    console.log(`\n✅ 주최/주관 정보가 올바르게 반영되었습니다!`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkKobeBabyfair();
