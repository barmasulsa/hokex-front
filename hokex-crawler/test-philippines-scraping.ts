/**
 * 필리핀 유학박람회 venue_hall 스크래핑 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function test() {
  const scraper = new PosterScraper();
  
  console.log('필리핀 유학박람회 스크래핑 테스트\n');
  
  const result = await scraper.scrapeCoexEventPage('제53회 필리핀유학박람회');
  
  console.log('\n결과:');
  console.log(`  venue_hall: ${result.venueHall || '(없음)'}`);
  console.log(`  poster: ${result.posterUrl ? '✅' : '❌'}`);
  console.log(`  venueEventPageUrl: ${result.venueEventPageUrl || '(없음)'}`);
}

test();
