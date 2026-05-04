/**
 * 필리핀 유학박람회 이벤트 venue_hall 확인
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkEvent() {
  const eventId = '2de214a0-6a52-4be3-b8e9-d0b44195af67';
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue_hall, venue_event_page_url')
    .eq('id', eventId)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n=== 이벤트 정보 ===');
  console.log('제목:', data.title);
  console.log('venue_hall:', data.venue_hall);
  console.log('venue_event_page_url:', data.venue_event_page_url);
  console.log();
}

checkEvent().catch(console.error);
