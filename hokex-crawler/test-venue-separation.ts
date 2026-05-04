/**
 * 장소 구분 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function test() {
  const scraper = new PosterScraper();
  
  console.log('장소 구분 테스트\n');
  
  const result = await scraper.scrapeCoexEventPage('2026 글로벌 탤런트 페어');
  
  console.log(`결과: ${result.venueHall || '(없음)'}`);
  console.log(`\n예상: Hall B, 컨퍼런스룸 E`);
}

test();
