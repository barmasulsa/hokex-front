/**
 * 특정 이벤트의 contact 필드 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

async function checkEvent() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from('events')
    .select('id, title, contact, venue_hall, venue_event_page_url, start_date, end_date')
    .eq('id', '13e0a066-89a8-4c86-994a-bcfcd9dc0138')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Event:', data.title);
  console.log('\nStart Date:', data.start_date);
  console.log('End Date:', data.end_date);
  console.log('\nVenue Hall:', data.venue_hall);
  console.log('Venue Event Page URL:', data.venue_event_page_url);
  console.log('\nContact field:');
  console.log('---');
  console.log(data.contact);
  console.log('---');
}

checkEvent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
