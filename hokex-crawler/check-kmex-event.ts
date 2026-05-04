/**
 * K-MEX 2026 행사 존재 여부 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKMEXEvent() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  K-MEX 2026 행사 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // K-MEX 행사 검색
  const { data: kmexEvents } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%K-MEX%')
    .order('last_crawled_at', { ascending: false });
  
  if (!kmexEvents || kmexEvents.length === 0) {
    console.log('❌ K-MEX 행사를 찾을 수 없습니다.\n');
    return;
  }

  console.log(`✅ K-MEX 행사 ${kmexEvents.length}개 발견:\n`);
  
  kmexEvents.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   Category: ${event.category}`);
    console.log(`   Industry: ${event.industry}`);
    console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
    console.log(`   마지막 크롤링: ${event.last_crawled_at}`);
    console.log('');
  });
}

checkKMEXEvent().catch(console.error);
