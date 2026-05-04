/**
 * venue_hall 정규화 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function test() {
  const scraper = new PosterScraper();
  
  const testCases = [
    '2026 스마트테크 코리아_스마트테크쇼-시큐테크쇼',  // HallB
    '캐릭터 라이선싱 페어 2026',  // HallAHall B1
    '넥스트라이즈 2026',  // HallA, B
    '제53회 필리핀유학박람회',  // 컨퍼런스룸(남) 3F
  ];
  
  for (const title of testCases) {
    console.log(`\n테스트: ${title}`);
    const result = await scraper.scrapeCoexEventPage(title);
    console.log(`  결과: ${result.venueHall || '(없음)'}`);
  }
}

test();
