/**
 * API 응답 확인 - 프론트엔드가 받는 데이터 확인
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!; // 프론트엔드가 사용하는 키

async function checkApiResponse() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('🔍 프론트엔드 API 응답 확인\n');
  console.log('Using ANON KEY (same as frontend)');
  console.log('URL:', SUPABASE_URL);
  console.log();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', '13e0a066-89a8-4c86-994a-bcfcd9dc0138')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Event data received by frontend:\n');
  console.log('Title:', data.title);
  console.log('Target Link:', data.target_link);
  console.log('Venue Event Page URL:', data.venue_event_page_url);
  console.log('\nFull data:');
  console.log(JSON.stringify(data, null, 2));
}

checkApiResponse()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
