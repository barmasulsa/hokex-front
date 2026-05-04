/**
 * venue_hall을 찾지 못한 행사들 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkFailedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue, venue_hall, venue_event_page_url')
    .eq('venue', '코엑스')
    .is('venue_hall', null)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`venue_hall이 없는 COEX 행사 (처음 10개):\n`);
  
  data?.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   URL: ${event.venue_event_page_url}`);
    console.log('');
  });
}

checkFailedEvents();
