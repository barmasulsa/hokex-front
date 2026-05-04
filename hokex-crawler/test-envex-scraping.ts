/**
 * 제47회 국제환경산업기술&그린에너지전 크롤링 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testEnvexScraping() {
  console.log('=== 제47회 국제환경산업기술&그린에너지전 크롤링 테스트 ===\n');

  const scraper = new PosterScraper();
  const eventTitle = '제47회 국제환경산업기술&그린에너지전';

  try {
    const result = await scraper.scrapeCoexEventPage(eventTitle);

    console.log('\n📋 크롤링 결과:\n');
    console.log(`포스터: ${result.posterUrl || '없음'}`);
    console.log(`\n행사 소개: ${result.description || '없음'}`);
    console.log(`\n입장료: ${result.admissionFee || '없음'}`);
    console.log(`\n주최: ${result.organizer || '없음'}`);
    console.log(`\n주관: ${result.supervisor || '없음'}`);
    console.log(`\n전시품목: ${result.exhibitItems || '없음'}`);
    console.log(`\n전시제품: ${result.exhibitProducts || '없음'}`);
    console.log(`\n담당자: ${result.contact || '없음'}`);
    console.log(`\n운영시간: ${result.operatingHours || '없음'}`);
    console.log(`\n관람장소: ${result.venueHall || '없음'}`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

testEnvexScraping();
