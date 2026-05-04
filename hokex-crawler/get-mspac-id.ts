/**
 * MSPAC 2026 행사 ID 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function getMspacId() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue, venue_hall, venue_event_page_url')
    .ilike('title', '%MSPAC%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('MSPAC 2026 행사 정보:');
  data?.forEach(event => {
    console.log(`\nID: ${event.id}`);
    console.log(`제목: ${event.title}`);
    console.log(`장소: ${event.venue}`);
    console.log(`관람 장소: ${event.venue_hall || '(없음)'}`);
    console.log(`전시장 행사 페이지: ${event.venue_event_page_url || '(없음)'}`);
    console.log(`\n프론트엔드 URL: https://hokex-front.vercel.app/event/${event.id}`);
  });
}

getMspacId();
