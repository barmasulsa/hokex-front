/**
 * venue_hall 업데이트 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function verifyUpdates() {
  console.log('=== venue_hall 업데이트 확인 ===\n');

  // venue_hall이 있는 COEX 이벤트 가져오기
  const { data: withVenueHall, error: withError } = await supabase
    .from('events')
    .select('id, title, venue_hall')
    .eq('venue', '코엑스')
    .not('venue_hall', 'is', null);

  // venue_hall이 없는 COEX 이벤트 가져오기
  const { data: withoutVenueHall, error: withoutError } = await supabase
    .from('events')
    .select('id, title, venue_hall')
    .eq('venue', '코엑스')
    .is('venue_hall', null);

  if (withError || withoutError) {
    console.error('❌ Error:', withError || withoutError);
    return;
  }

  console.log(`✅ venue_hall 있음: ${withVenueHall?.length || 0}개`);
  console.log(`❌ venue_hall 없음: ${withoutVenueHall?.length || 0}개\n`);

  // 샘플 출력 (처음 10개)
  console.log('=== venue_hall 샘플 (처음 10개) ===\n');
  withVenueHall?.slice(0, 10).forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   venue_hall: ${event.venue_hall}`);
    console.log(`   프론트엔드: https://hokex-front.vercel.app/event/${event.id}\n`);
  });

  // venue_hall이 없는 이벤트 출력
  if (withoutVenueHall && withoutVenueHall.length > 0) {
    console.log('=== venue_hall이 없는 이벤트 ===\n');
    withoutVenueHall.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   프론트엔드: https://hokex-front.vercel.app/event/${event.id}\n`);
    });
  }
}

verifyUpdates().catch(console.error);
