/**
 * 여러 홀 추출 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testMultipleHalls() {
  const scraper = new PosterScraper();
  
  const eventTitle = '2026 글로벌 탤런트 페어';
  
  console.log(`🧪 테스트: ${eventTitle}\n`);
  console.log('포스터 및 장소 정보 스크래핑 중...\n');
  
  const result = await scraper.scrapeCoexEventPage(eventTitle);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 결과:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result.posterUrl) {
    console.log(`✅ 포스터: ${result.posterUrl}\n`);
  } else {
    console.log(`❌ 포스터: 없음\n`);
  }
  
  if (result.venueHall) {
    console.log(`📍 장소: ${result.venueHall}`);
    const halls = result.venueHall.split(',').map(h => h.trim());
    console.log(`   총 ${halls.length}개 장소:`);
    halls.forEach((hall, idx) => {
      console.log(`   ${idx + 1}. ${hall}`);
    });
  } else {
    console.log(`❌ 장소: 없음`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result.errorCategory) {
    console.log(`⚠️  에러: [${result.errorCategory}] ${result.errorMessage}\n`);
  }
}

testMultipleHalls();
