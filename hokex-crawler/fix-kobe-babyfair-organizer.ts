/**
 * 2026 코베 베이비페어 주최 정보 수정 (메쎄이 → 메쎄이상)
 */

import { SupabaseService } from './src/services/supabase';

async function fixKobeBabyfairOrganizer() {
  console.log('=== 2026 코베 베이비페어 주최 정보 수정 ===\n');

  const supabase = new SupabaseService();

  try {
    // 행사 찾기
    const { data: events, error: searchError } = await (supabase as any).client
      .from('events')
      .select('*')
      .eq('title', '2026 코베 베이비페어')
      .eq('venue', '코엑스');

    if (searchError) {
      console.error('❌ 검색 실패:', searchError);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  행사를 찾을 수 없습니다.');
      return;
    }

    const event = events[0];

    console.log('📋 현재 정보:');
    console.log(`  주최: ${event.organizer}`);
    console.log(`  주관: ${event.supervisor || '없음'}`);

    // 업데이트
    const { error: updateError } = await (supabase as any).client
      .from('events')
      .update({
        organizer: '코엑스, 메쎄이상'
      })
      .eq('id', event.id);

    if (updateError) {
      console.error('❌ 업데이트 실패:', updateError);
      return;
    }

    console.log('\n✅ 업데이트 완료!');
    console.log('  주최: 코엑스, 메쎄이상');

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

fixKobeBabyfairOrganizer();
