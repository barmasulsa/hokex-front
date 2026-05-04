/**
 * 2026년 1월~4월 코엑스 행사 크롤링
 */

import { CoexScheduleScraper } from './src/services/coex-schedule-scraper';
import { SupabaseService } from './src/services/supabase';
import { PosterScraper } from './src/services/poster-scraper';

async function crawlJanApr2026() {
  console.log('=== 2026년 1월~4월 코엑스 행사 크롤링 시작 ===\n');

  const scraper = new CoexScheduleScraper();
  const supabase = new SupabaseService();
  const posterScraper = new PosterScraper();

  try {
    // 1월 크롤링
    console.log('📅 2026년 1월 크롤링 중...');
    const jan2026 = await scraper.scrapeMonth(2026, 1);
    console.log(`✅ 1월: ${jan2026.length}개 행사 발견\n`);

    // 2월 크롤링
    console.log('📅 2026년 2월 크롤링 중...');
    const feb2026 = await scraper.scrapeMonth(2026, 2);
    console.log(`✅ 2월: ${feb2026.length}개 행사 발견\n`);

    // 3월 크롤링
    console.log('📅 2026년 3월 크롤링 중...');
    const mar2026 = await scraper.scrapeMonth(2026, 3);
    console.log(`✅ 3월: ${mar2026.length}개 행사 발견\n`);

    // 4월 크롤링
    console.log('📅 2026년 4월 크롤링 중...');
    const apr2026 = await scraper.scrapeMonth(2026, 4);
    console.log(`✅ 4월: ${apr2026.length}개 행사 발견\n`);

    const allEvents = [...jan2026, ...feb2026, ...mar2026, ...apr2026];
    console.log(`\n총 ${allEvents.length}개 행사 발견`);

    if (allEvents.length === 0) {
      console.log('❌ 크롤링된 행사가 없습니다.');
      return;
    }

    // 포스터 URL 추가
    console.log('\n🖼️  포스터 URL 크롤링 중...');
    for (const event of allEvents) {
      try {
        const posterUrl = await posterScraper.scrapePosterUrl(event.targetLink);
        if (posterUrl) {
          event.posterUrl = posterUrl;
          console.log(`✅ ${event.title}: 포스터 발견`);
        } else {
          console.log(`⚠️  ${event.title}: 포스터 없음`);
        }
      } catch (error) {
        console.log(`❌ ${event.title}: 포스터 크롤링 실패`);
      }
    }

    // 데이터베이스 저장
    console.log('\n💾 데이터베이스 저장 중...');
    const savedCount = await supabase.saveEvents(allEvents, 'COEX');
    console.log(`✅ ${savedCount}/${allEvents.length}개 행사 저장 완료`);

    // 저장된 행사 목록 출력
    console.log('\n📋 저장된 행사 목록:');
    allEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   기간: ${event.startDate} ~ ${event.endDate}`);
      console.log(`   장소: ${event.venue}`);
    });

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
  }
}

crawlJanApr2026();
