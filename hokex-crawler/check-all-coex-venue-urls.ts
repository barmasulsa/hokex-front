/**
 * 모든 COEX 행사의 venue_event_page_url 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkAllCoexVenueUrls() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue, venue_hall, venue_event_page_url')
    .eq('venue', '코엑스')
    .order('title');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${data?.length}개의 COEX 행사\n`);

  let withUrl = 0;
  let withoutUrl = 0;
  let withVenueHall = 0;
  let withoutVenueHall = 0;

  data?.forEach(event => {
    if (event.venue_event_page_url) withUrl++;
    else withoutUrl++;
    
    if (event.venue_hall) withVenueHall++;
    else withoutVenueHall++;
  });

  console.log('📊 통계:');
  console.log(`  전시장 행사 페이지 URL 있음: ${withUrl}개`);
  console.log(`  전시장 행사 페이지 URL 없음: ${withoutUrl}개`);
  console.log(`  관람 장소(venue_hall) 있음: ${withVenueHall}개`);
  console.log(`  관람 장소(venue_hall) 없음: ${withoutVenueHall}개`);

  // 샘플 5개 출력
  console.log('\n📋 샘플 행사 (처음 5개):');
  data?.slice(0, 5).forEach(event => {
    console.log(`\n제목: ${event.title}`);
    console.log(`  관람 장소: ${event.venue_hall || '(없음)'}`);
    console.log(`  전시장 페이지: ${event.venue_event_page_url ? '✅ 있음' : '❌ 없음'}`);
    console.log(`  프론트엔드: https://hokex-front.vercel.app/event/${event.id}`);
  });
}

checkAllCoexVenueUrls();
