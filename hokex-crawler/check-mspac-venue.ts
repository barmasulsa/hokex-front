/**
 * MSPAC 2026 행사의 venue_hall 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkMspacVenue() {
  const { data, error } = await supabase
    .from('events')
    .select('title, venue, venue_hall')
    .or('title.ilike.%MSPAC%,title.ilike.%글로벌 탤런트%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results:');
  data?.forEach(event => {
    console.log(`\n제목: ${event.title}`);
    console.log(`장소: ${event.venue}`);
    console.log(`관람 장소: ${event.venue_hall || '(없음)'}`);
  });
}

checkMspacVenue();
