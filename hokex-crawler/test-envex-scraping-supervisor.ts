/**
 * 제47회 국제환경산업기술&그린에너지전의 주관 정보 스크래핑 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testEnvexScraping() {
  console.log('=== 코엑스 페이지 스크래핑 테스트 ===\n');

  const scraper = new PosterScraper();
  const title = '제47회 국제환경산업기술&그린에너지전';

  try {
    const result = await scraper.scrapeCoexEventPage(title);

    console.log('📋 스크래핑 결과:\n');
    console.log(`제목: ${title}`);
    console.log(`\n주최: ${result.organizer || '없음'}`);
    console.log(`\n주관: ${result.supervisor || '없음'}`);
    console.log(`\n전시품목: ${result.exhibitItems || '없음'}`);
    console.log(`\n행사 소개: ${result.description ? result.description.substring(0, 100) + '...' : '없음'}`);
    console.log(`\n입장료: ${result.admissionFee || '없음'}`);
    console.log(`\n담당자: ${result.contact || '없음'}`);
    console.log(`\n운영시간: ${result.operatingHours || '없음'}`);
    console.log(`\n관람장소: ${result.venueHall || '없음'}`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

testEnvexScraping();
