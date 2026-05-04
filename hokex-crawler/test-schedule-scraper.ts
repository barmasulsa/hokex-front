/**
 * CoexScheduleScraper 테스트
 */

import { CoexScheduleScraper } from './src/services/coex-schedule-scraper';

async function test() {
  const scraper = new CoexScheduleScraper();
  
  console.log('📋 COEX 일정 페이지에서 포스터 정보 수집 중...\n');
  
  const posterMap = await scraper.scrapeAllEventPosters();
  
  console.log(`\n✅ 총 ${posterMap.size}개 행사 포스터 수집 완료\n`);
  
  // 미국 학부 유학 박람회 찾기
  console.log('🔍 "미국 학부 유학 박람회" 포스터 찾기:\n');
  
  const testTitle = '미국 학부 유학 박람회';
  const posterUrl = scraper.findPosterByTitle(testTitle, posterMap);
  
  if (posterUrl) {
    console.log(`✅ 발견!`);
    console.log(`   포스터: ${posterUrl}`);
  } else {
    console.log(`❌ 찾을 수 없음`);
  }
  
  // 처음 5개 행사 출력
  console.log('\n\n📋 처음 5개 행사:\n');
  let count = 0;
  for (const [key, value] of posterMap.entries()) {
    if (count >= 5) break;
    console.log(`${count + 1}. ${value.title}`);
    console.log(`   정규화: ${key}`);
    console.log(`   포스터: ${value.posterUrl}`);
    console.log(`   날짜: ${value.startDate || 'N/A'}`);
    console.log(`   홀: ${value.hall || 'N/A'}\n`);
    count++;
  }
}

test();
