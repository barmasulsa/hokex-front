/**
 * 남은 6개 행사의 포스터를 COEX 일정 페이지에서 크롤링하여 업데이트
 */

import { createClient } from '@supabase/supabase-js';
import { CoexScheduleScraper } from './src/services/coex-schedule-scraper';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRemainingPosters() {
  console.log('=== 남은 포스터 없는 행사 수정 ===\n');

  // 1. 포스터 없는 행사 찾기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .is('poster_url', null)
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

  if (!events || events.length === 0) {
    console.log('✅ 모든 행사에 포스터가 있습니다!');
    return;
  }

  console.log(`📋 포스터 없는 행사: ${events.length}개\n`);
  events.forEach(event => {
    console.log(`  - ${event.title}`);
  });
  console.log();

  // 2. COEX 일정 페이지에서 포스터 정보 크롤링
  const scraper = new CoexScheduleScraper();
  const posterMap = await scraper.scrapeAllEventPosters();

  if (posterMap.size === 0) {
    console.log('❌ COEX 페이지에서 포스터를 가져올 수 없습니다.');
    return;
  }

  // 3. 각 행사에 대해 포스터 찾기 및 업데이트
  console.log('🔍 행사명 매칭 및 포스터 업데이트 중...\n');

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);

    // 포스터 찾기
    const posterUrl = scraper.findPosterByTitle(event.title, posterMap);

    if (posterUrl) {
      // 포스터 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: posterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (!updateError) {
        console.log(`✅ 포스터 업데이트 성공`);
        console.log(`   URL: ${posterUrl.substring(0, 80)}...`);
        updatedCount++;
      } else {
        console.log(`❌ 업데이트 실패:`, updateError);
      }
    } else {
      console.log(`⚠️  COEX 페이지에서 매칭되는 행사를 찾을 수 없습니다`);
      console.log(`   관련 사이트: ${event.target_link || '없음'}`);
      
      // 관련 사이트가 있으면 직접 크롤링 시도
      if (event.target_link) {
        console.log(`   → 관련 사이트에서 포스터 크롤링 시도 필요`);
      }
      
      notFoundCount++;
    }
  }

  console.log('\n=== 업데이트 완료 ===');
  console.log(`✅ 업데이트 성공: ${updatedCount}개`);
  console.log(`⚠️  매칭 실패: ${notFoundCount}개`);

  if (notFoundCount > 0) {
    console.log('\n💡 매칭 실패한 행사는 다음 방법으로 처리할 수 있습니다:');
    console.log('   1. 관련 사이트에서 직접 포스터 크롤링');
    console.log('   2. COEX에 문의하여 포스터 확보');
    console.log('   3. 수동으로 포스터 URL 입력');
  }
}

fixRemainingPosters();
