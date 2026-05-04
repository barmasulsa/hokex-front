/**
 * 오늘 크롤링된 데이터 확인
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

async function checkTodayCrawl() {
  const today = '2026-05-02';
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  오늘(${today}) 크롤링된 데이터 확인`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 오늘 크롤링된 웨딩 행사
  console.log('1️⃣  웨딩 관련 행사 (오늘 크롤링):');
  const { data: weddingEvents } = await supabase
    .from('events')
    .select('title, industry, last_crawled_at')
    .ilike('title', '%웨딩%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .order('title');
  
  weddingEvents?.forEach(event => {
    const status = event.industry === '웨딩' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 오늘 크롤링된 예술 행사
  console.log('\n2️⃣  예술 관련 행사 (오늘 크롤링):');
  const { data: artEvents } = await supabase
    .from('events')
    .select('title, industry, last_crawled_at')
    .or('title.ilike.%예술%,title.ilike.%아트%,title.ilike.%일러스트%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .order('title');
  
  artEvents?.forEach(event => {
    const status = event.industry === '문화/예술' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 오늘 크롤링된 베이비 행사
  console.log('\n3️⃣  베이비/육아 관련 행사 (오늘 크롤링):');
  const { data: babyEvents } = await supabase
    .from('events')
    .select('title, industry, last_crawled_at')
    .or('title.ilike.%베이비%,title.ilike.%유아%,title.ilike.%육아%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .order('title');
  
  babyEvents?.forEach(event => {
    const status = event.industry === '임신/출산/육아' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 오늘 크롤링된 교육 행사
  console.log('\n4️⃣  교육 관련 행사 (오늘 크롤링):');
  const { data: eduEvents } = await supabase
    .from('events')
    .select('title, industry, last_crawled_at')
    .or('title.ilike.%교육%,title.ilike.%유학%,title.ilike.%입학%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .order('title');
  
  eduEvents?.forEach(event => {
    const status = event.industry === '교육' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  검증 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

checkTodayCrawl().catch(console.error);
