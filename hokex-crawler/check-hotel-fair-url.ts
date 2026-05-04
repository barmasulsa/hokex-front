/**
 * 호텔페어 URL 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHotelFairUrl() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%호텔페어%');

  if (error || !events) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${events.length}개 호텔페어 행사:\n`);

  events.forEach(event => {
    console.log(`행사명: ${event.title}`);
    console.log(`URL: ${event.target_link}`);
    console.log(`주최: ${event.organizer || '없음'}`);
    console.log(`주관: ${event.supervisor || '없음'}`);
    console.log();
  });
}

checkHotelFairUrl();
