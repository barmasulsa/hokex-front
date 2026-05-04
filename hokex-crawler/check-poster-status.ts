/**
 * 1월~4월 행사 포스터 상태 확인
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

async function checkPosterStatus() {
  console.log('=== 1월~4월 행사 포스터 상태 확인 ===\n');

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .or(
      'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
      'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
      'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
    )
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${events?.length || 0}개의 행사\n`);

  if (!events || events.length === 0) {
    return;
  }

  let hasValidPoster = 0;
  let hasDefaultPoster = 0;
  let hasNoPoster = 0;

  const defaultPosters = [
    'https://www.coex.co.kr/wp-content/themes/coex-visitor/assets/images/bg/bs-event.png',
    'https://via.placeholder.com',
  ];

  const noPosterEvents: any[] = [];
  const defaultPosterEvents: any[] = [];

  events.forEach(event => {
    if (!event.poster_url) {
      hasNoPoster++;
      noPosterEvents.push(event);
    } else if (defaultPosters.some(dp => event.poster_url.includes(dp))) {
      hasDefaultPoster++;
      defaultPosterEvents.push(event);
    } else {
      hasValidPoster++;
    }
  });

  console.log('📊 포스터 상태:');
  console.log(`✅ 유효한 포스터: ${hasValidPoster}개`);
  console.log(`⚠️  기본 포스터: ${hasDefaultPoster}개`);
  console.log(`❌ 포스터 없음: ${hasNoPoster}개\n`);

  if (defaultPosterEvents.length > 0) {
    console.log('⚠️  기본 포스터 사용 중인 행사:');
    defaultPosterEvents.forEach(event => {
      console.log(`  - ${event.title}`);
      console.log(`    URL: ${event.poster_url}`);
      console.log(`    관련 사이트: ${event.target_link || '없음'}`);
    });
    console.log();
  }

  if (noPosterEvents.length > 0) {
    console.log('❌ 포스터 없는 행사:');
    noPosterEvents.forEach(event => {
      console.log(`  - ${event.title}`);
      console.log(`    관련 사이트: ${event.target_link || '없음'}`);
    });
  }
}

checkPosterStatus();
