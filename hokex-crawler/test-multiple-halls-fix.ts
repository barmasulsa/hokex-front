/**
 * 수정된 venue_hall 추출 로직 테스트
 * "2026 글로벌 탤런트 페어" 이벤트에서 Hall B와 컨퍼런스룸 E가 모두 추출되는지 확인
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testMultipleHallsFix() {
  console.log('🧪 Testing venue_hall extraction fix...\n');
  
  const scraper = new PosterScraper();
  const eventTitle = '2026 글로벌 탤런트 페어';
  
  console.log(`📋 Event: ${eventTitle}`);
  console.log('🔗 URL: https://www.coex.co.kr/exhibitions/2026-%ea%b8%80%eb%a1%9c%eb%b2%8c-%ed%83%a4%eb%9f%b0%ed%8a%b8-%ed%8e%98%ec%96%b4/\n');
  
  const result = await scraper.scrapeCoexEventPage(eventTitle);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Result:');
  console.log(`   Poster URL: ${result.posterUrl ? '✅ Found' : '❌ Not found'}`);
  console.log(`   Venue Hall: ${result.venueHall || '❌ Not found'}\n`);
  
  if (result.venueHall) {
    const halls = result.venueHall.split(', ');
    console.log(`   📍 Extracted ${halls.length} venue(s):`);
    halls.forEach((hall, idx) => {
      console.log(`      ${idx + 1}. ${hall}`);
    });
    console.log();
    
    // 검증
    const hasHallB = halls.some(h => h.toLowerCase().includes('hall b'));
    const hasConferenceE = halls.some(h => h.includes('컨퍼런스룸 E') || h.toLowerCase().includes('conference room e'));
    
    console.log('✅ Validation:');
    console.log(`   Hall B: ${hasHallB ? '✅ Found' : '❌ Missing'}`);
    console.log(`   컨퍼런스룸 E: ${hasConferenceE ? '✅ Found' : '❌ Missing'}`);
    
    if (hasHallB && hasConferenceE) {
      console.log('\n🎉 SUCCESS: Both venues extracted correctly!');
    } else {
      console.log('\n❌ FAILED: Missing one or more venues');
    }
  } else {
    console.log('❌ FAILED: No venue_hall extracted');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testMultipleHallsFix();
