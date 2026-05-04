/**
 * 포스터 없는 행사들의 포스터를 COEX 일정 페이지에서 매칭
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

async function fixMissingPosters() {
  console.log('=== 포스터 없는 행사 수정 시작 ===\n');

  // 1. COEX 일정 페이지에서 모든 포스터 정보 수집
  console.log('📥 COEX 일정 페이지에서 포스터 정보 수집 중...\n');
  const scraper = new CoexScheduleScraper();
  const posterMap = await scraper.scrapeAllEventPosters();

  console.log(`✅ ${posterMap.size}개 행사 포스터 정보 수집 완료\n`);

  // 2. 포스터 없거나 기본 포스터인 행사 조회
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

  const defaultPosters = [
    'https://www.coex.co.kr/wp-content/themes/coex-visitor/assets/images/bg/bs-event.png',
    'https://via.placeholder.com',
  ];

  const needsUpdate = events?.filter(event => 
    !event.poster_url || 
    defaultPosters.some(dp => event.poster_url?.includes(dp))
  ) || [];

  console.log(`🔍 업데이트 필요한 행사: ${needsUpdate.length}개\n`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const event of needsUpdate) {
    console.log(`\n처리 중: ${event.title}`);

    // 행사명으로 포스터 찾기
    const posterUrl = scraper.findPosterByTitle(event.title, posterMap);

    if (posterUrl && !defaultPosters.some(dp => posterUrl.includes(dp))) {
      // 유효한 포스터 발견
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: posterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) {
        console.log(`   ❌ 업데이트 실패: ${updateError.message}`);
      } else {
        console.log(`   ✅ 포스터 업데이트: ${posterUrl.substring(0, 60)}...`);
        updatedCount++;
      }
    } else {
      console.log(`   ⚠️  매칭되는 포스터 없음`);
      notFoundCount++;
    }
  }

  console.log('\n=== 업데이트 완료 ===');
  console.log(`✅ 포스터 업데이트: ${updatedCount}개`);
  console.log(`⚠️  포스터 없음: ${notFoundCount}개`);
  console.log(`📊 전체: ${needsUpdate.length}개`);
}

fixMissingPosters();
