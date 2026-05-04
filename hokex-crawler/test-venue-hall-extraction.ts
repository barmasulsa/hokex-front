/**
 * 특정 COEX 이벤트 페이지에서 venue_hall 추출 테스트
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testVenueHallExtraction() {
  const url = 'https://www.coex.co.kr/exhibitions/2026-%ea%b8%80%eb%a1%9c%eb%b2%8c-%ed%83%a4%eb%9f%b0%ed%8a%b8-%ed%8e%98%ec%96%b4/';
  
  console.log('🔍 URL:', url);
  console.log('\n페이지 가져오는 중...\n');

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log('✅ 페이지 로드 성공\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 전체 페이지 텍스트에서 Hall 패턴 찾기
    const bodyText = $('body').text();
    
    console.log('📍 방법 1: 전체 페이지 텍스트에서 Hall 패턴 찾기');
    const hallPatterns = [
      /Hall\s*[A-D]/gi,
      /홀\s*[A-D가-힣]/g,
      /전시장\s*[A-D가-힣]/g,
      /[1-4]홀/g,
    ];
    
    for (const pattern of hallPatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`   패턴 ${pattern}: ${matches.join(', ')}`);
      }
    }

    console.log('\n📍 방법 2: "장소" 관련 레이블 찾기');
    const labels = ['관람 장소', '장소', '전시장', '개최장소', '행사장소'];
    
    for (const label of labels) {
      const elements = $('*').filter(function() {
        const text = $(this).text().trim();
        return text === label || text.includes(label);
      });

      if (elements.length > 0) {
        console.log(`\n   레이블 "${label}" 발견 (${elements.length}개):`);
        
        elements.each((idx, elem) => {
          if (idx < 3) { // 처음 3개만 출력
            const element = $(elem);
            const parent = element.parent();
            const parentText = parent.text().trim();
            
            console.log(`   ${idx + 1}. 부모 텍스트: ${parentText.substring(0, 100)}...`);
            
            // 다음 형제 요소
            const next = element.next();
            if (next.length > 0) {
              console.log(`      다음 요소: ${next.text().trim().substring(0, 100)}`);
            }
          }
        });
      }
    }

    console.log('\n📍 방법 3: EventDetailBoxBodyTitle 구조 찾기');
    const titleElements = $('.EventDetailBoxBodyTitle').filter(function() {
      const text = $(this).text().trim();
      return text.includes('장소') || text.includes('관람');
    });

    if (titleElements.length > 0) {
      console.log(`   EventDetailBoxBodyTitle 발견 (${titleElements.length}개):`);
      
      titleElements.each((idx, elem) => {
        const element = $(elem);
        const title = element.text().trim();
        const parent = element.parent();
        const textElement = parent.find('.EventDetailBoxBodyText-txt').first();
        
        console.log(`   ${idx + 1}. 제목: ${title}`);
        if (textElement.length > 0) {
          console.log(`      내용: ${textElement.text().trim()}`);
        }
      });
    }

    console.log('\n📍 방법 4: dt/dd 구조에서 장소 찾기');
    const dtElements = $('dt').filter(function() {
      const text = $(this).text().trim();
      return text.includes('장소') || text.includes('관람');
    });

    if (dtElements.length > 0) {
      console.log(`   dt 요소 발견 (${dtElements.length}개):`);
      
      dtElements.each((idx, elem) => {
        const dt = $(elem);
        const dd = dt.next('dd');
        
        console.log(`   ${idx + 1}. dt: ${dt.text().trim()}`);
        if (dd.length > 0) {
          console.log(`      dd: ${dd.text().trim()}`);
        }
      });
    }

    console.log('\n📍 방법 5: Hall이 포함된 모든 요소 찾기');
    const hallElements = $('*').filter(function() {
      const text = $(this).text();
      return /Hall\s*[A-D]/i.test(text) && $(this).children().length === 0; // 자식이 없는 leaf 노드만
    });

    console.log(`   Hall이 포함된 요소 (${hallElements.length}개):`);
    hallElements.each((idx, elem) => {
      if (idx < 10) {
        const element = $(elem);
        const text = element.text().trim();
        const tagName = element.prop('tagName');
        const className = element.attr('class') || '';
        
        console.log(`   ${idx + 1}. <${tagName}> class="${className}": ${text.substring(0, 100)}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ 에러:', error.message);
  }
}

testVenueHallExtraction();
