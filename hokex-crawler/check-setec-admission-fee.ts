/**
 * SETEC 행사 상세 페이지에서 입장료 정보 확인
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkAdmissionFee() {
  const testUrls = [
    'https://www.setec.or.kr/front/schedule/view.do?sIdx=2280', // 관상어 파충류
    'https://www.setec.or.kr/front/schedule/view.do?sIdx=2262', // 하비페어
    'https://www.setec.or.kr/front/schedule/view.do?sIdx=2290', // 서울아트페어
  ];
  
  for (const testUrl of testUrls) {
    console.log(`\n🔍 ${testUrl}\n`);
  
    try {
      const response = await axios.get(testUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      console.log('📋 필드 목록:');

      $('.txt_area ul li').each((_, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.tit').text().trim();
        const value = $elem.find('p').text().trim();
        
        console.log(`  ${title}: ${value}`);
      });

    } catch (error) {
      console.error('❌ 페이지 확인 실패:', error);
    }
  }
}

checkAdmissionFee();
