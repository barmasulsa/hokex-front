/**
 * 모든 COEX 행사의 venue_hall 다시 스크래핑
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PosterScraper } from './src/services/poster-scraper';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function rescrapeAllCoexVenueHalls() {
  console.log('🔄 모든 COEX 행사의 venue_hall 다시 스크래핑 시작\n');

  // COEX 행사 모두 가져오기
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, venue, venue_hall')
    .eq('venue', '코엑스');

  if (error) {
    console.error('❌ Error fetching events:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('❌ COEX 행사가 없습니다.');
    return;
  }

  console.log(`📊 총 ${events.length}개의 COEX 행사 발견\n`);

  const scraper = new PosterScraper();
  let successCount = 0;
  let failCount = 0;
  let unchangedCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);
    console.log(`  현재 venue_hall: ${event.venue_hall || '(없음)'}`);

    try {
      // COEX 페이지에서 venue_hall 스크래핑
      const result = await scraper.scrapeCoexEventPage(event.title);

      if (result.venueHall) {
        console.log(`  스크래핑된 venue_hall: ${result.venueHall}`);

        // 기존 값과 다른 경우에만 업데이트
        if (event.venue_hall !== result.venueHall) {
          const { error: updateError } = await supabase
            .from('events')
            .update({ venue_hall: result.venueHall })
            .eq('id', event.id);

          if (updateError) {
            console.error(`  ❌ 업데이트 실패:`, updateError);
            failCount++;
          } else {
            console.log(`  ✅ 업데이트 성공: ${event.venue_hall || '(없음)'} → ${result.venueHall}`);
            successCount++;
          }
        } else {
          console.log(`  ⏭️  변경 없음 (이미 동일한 값)`);
          unchangedCount++;
        }
      } else {
        console.log(`  ⚠️  venue_hall을 찾을 수 없음`);
        failCount++;
      }
    } catch (error) {
      console.error(`  ❌ 스크래핑 실패:`, error);
      failCount++;
    }

    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 결과:');
  console.log(`  ✅ 업데이트 성공: ${successCount}개`);
  console.log(`  ⏭️  변경 없음: ${unchangedCount}개`);
  console.log(`  ❌ 실패: ${failCount}개`);
  console.log('='.repeat(60));
}

rescrapeAllCoexVenueHalls()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
