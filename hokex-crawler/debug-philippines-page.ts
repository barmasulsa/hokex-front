/**
 * 필리핀 유학박람회 COEX 페이지 HTML 구조 디버깅
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugPage() {
  const url = 'https://www.coex.co.kr/exhibitions/제53회-필리핀유학박람회/';
  
  console.log(`페이지 확인: ${url}\n`);
  
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(response.data);
  
  // "장소" 또는 "관람 장소"가 포함된 모든 요소 찾기
  console.log('=== "장소" 텍스트가 포함된 요소들 ===\n');
  
  $('*').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.includes('장소') && text.length < 100) {
      const tagName = elem.tagName;
      const className = $(elem).attr('class') || '';
      const parent = $(elem).parent();
      const parentClass = parent.attr('class') || '';
      
      console.log(`태그: <${tagName}> 클래스: ${className}`);
      console.log(`텍스트: ${text}`);
      console.log(`부모 태그: <${parent.prop('tagName')}> 클래스: ${parentClass}`);
      
      // 다음 형제 요소 확인
      const next = $(elem).next();
      if (next.length > 0) {
        console.log(`다음 요소: <${next.prop('tagName')}> 텍스트: ${next.text().trim()}`);
      }
      
      // 같은 부모 내의 다른 요소들
      const siblings = parent.children();
      console.log(`형제 요소 개수: ${siblings.length}`);
      siblings.each((i, sibling) => {
        const sibText = $(sibling).text().trim();
        if (sibText && sibText !== text && sibText.length < 100) {
          console.log(`  형제 ${i}: ${sibText}`);
        }
      });
      
      console.log('---\n');
    }
  });
  
  // EventDetailBoxBodyTitle 구조 확인
  console.log('\n=== EventDetailBoxBodyTitle 구조 ===\n');
  $('.EventDetailBoxBodyTitle').each((_, elem) => {
    const title = $(elem).text().trim();
    const parent = $(elem).parent();
    const textElement = parent.find('.EventDetailBoxBodyText-txt');
    
    console.log(`제목: ${title}`);
    if (textElement.length > 0) {
      console.log(`값: ${textElement.text().trim()}`);
    }
    console.log('---\n');
  });
}

debugPage().catch(console.error);
