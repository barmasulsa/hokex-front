/**
 * 웨덱스 행사 설명 테스트
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testWedexDescription() {
  const scraper = new PosterScraper();
  
  console.log('=== 제409회 웨덱스웨딩 대박람회 설명 크롤링 ===\n');
  
  // COEX 페이지에서 크롤링
  const coexUrl = 'https://www.coex.co.kr/exhibitions/제409회-웨덱스웨딩-대박람회/';
  
  console.log(`크롤링 중: ${coexUrl}\n`);
  
  const result = await scraper.scrapePostUrl(coexUrl, '제409회 웨덱스웨딩 대박람회', 'COEX');
  
  console.log('결과:');
  console.log('포스터:', result.posterUrl || '없음');
  console.log('설명:', result.description || '없음');
  console.log('입장료:', result.admissionFee || '없음');
  console.log('전시품목:', result.exhibitItems || '없음');
  console.log('전시제품:', result.exhibitProducts || '없음');
  console.log('주최:', result.organizer || '없음');
  console.log('연락처:', result.contact || '없음');
  console.log('운영시간:', result.operatingHours || '없음');
  console.log('홀:', result.venueHall || '없음');
}

testWedexDescription();
