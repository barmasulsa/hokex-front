/**
 * 행사 자체 웹사이트에서 포스터 스크래핑
 * COEX 페이지에서 실패한 행사들 대상
 */

import { createClient } from '@supabase/supabase-js';
import { PosterScraper } from './src/services/poster-scraper';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const scraper = new PosterScraper();

async function scrapeFromEventSites() {
  console.log('=== 행사 웹사이트에서 포스터 스크래핑 ===\n');

  // 포스터 없거나 기본 포스터인 행사 중 target_link가 있는 것만 조회
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .or(
      'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
      'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
      'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
    )
    .not('target_link', 'is', null)
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
  let failedCount = 0;

  for (let i = 0; i < needsUpdate.length; i++) {
    const event = needsUpdate[i];
    console.log(`\n[${i + 1}/${needsUpdate.length}] ${event.title}`);
    console.log(`  웹사이트: ${event.target_link}`);

    try {
      const result = await scraper.scrapePostUrl(event.target_link, event.title, event.venue_code);

      if (result.posterUrl) {
        console.log(`  ✅ 포스터 발견: ${result.posterUrl}`);

        const { error: updateError } = await supabase
          .from('events')
          .update({
            poster_url: result.posterUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (updateError) {
          console.log(`  ❌ 업데이트 실패: ${updateError.message}`);
          failedCount++;
        } else {
          console.log(`  💾 데이터베이스 업데이트 완료`);
          updatedCount++;
        }
      } else {
        console.log(`  ⚠️  포스터 없음`);
        failedCount++;
      }
    } catch (error: any) {
      console.log(`  ❌ 에러: ${error.message}`);
      failedCount++;
    }

    // 요청 간격 (1초)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 스크래핑 완료 ===');
  console.log(`✅ 포스터 업데이트: ${updatedCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
  console.log(`📊 전체: ${needsUpdate.length}개`);
}

scrapeFromEventSites();
