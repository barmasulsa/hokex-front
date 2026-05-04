/**
 * 주최/주관 크롤링 디버깅
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugOrganizerScraping() {
  // 몇 개 행사 URL 테스트
  const testUrls = [
    'https://www.coex.co.kr/exhibitions/2025-%ec%bd%94%eb%b2%a0-%eb%b2%a0%ec%9d%b4%eb%b9%84%ed%8e%98%ec%96%b4/',
    'https://www.coex.co.kr/exhibitions/2026-%ed%98%b8%ed%85%94%ed%8e%98%ec%96%b4/',
    'https://www.coex.co.kr/exhibitions/%ec%84%9c%ec%9a%b8%eb%a6%ac%eb%b9%99%eb%94%94%ec%9e%90%ec%9d%b8%ed%8e%98%ec%96%b4-2026/'
  ];

  for (const url of testUrls) {
    console.log(`\n=== ${url} ===\n`);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 행사명
      const title = $('h2').first().text().trim();
      console.log(`행사명: ${title}`);

      // 주최/주관 찾기
      let foundOrganizer = false;
      let foundSupervisor = false;

      $('.EventDetailBoxBody-item').each((_, item) => {
        const $item = $(item);
        const label = $item.find('.EventDetailBoxBodyTitle').text().trim();
        const text = $item.find('.EventDetailBoxBodyText-txt').text().trim();

        if (label === '주최' && text) {
          console.log(`✅ 주최: ${text}`);
          foundOrganizer = true;
        } else if (label === '주관' && text) {
          console.log(`✅ 주관: ${text}`);
          foundSupervisor = true;
        }
      });

      if (!foundOrganizer && !foundSupervisor) {
        console.log('⚠️  주최/주관 정보를 찾을 수 없습니다');
        
        // HTML 구조 확인
        console.log('\n=== HTML 구조 샘플 ===');
        const bodyItems = $('.EventDetailBoxBody-item');
        console.log(`EventDetailBoxBody-item 개수: ${bodyItems.length}`);
        
        if (bodyItems.length > 0) {
          bodyItems.each((i, item) => {
            if (i < 3) { // 처음 3개만
              const $item = $(item);
              console.log(`\n항목 ${i + 1}:`);
              console.log(`  Title: ${$item.find('.EventDetailBoxBodyTitle').text().trim()}`);
              console.log(`  Text: ${$item.find('.EventDetailBoxBodyText-txt').text().trim()}`);
            }
          });
        }
      }

    } catch (error: any) {
      console.log(`❌ 크롤링 실패: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

debugOrganizerScraping();
