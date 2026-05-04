/**
 * COEX 행사 일정 페이지 구조 분석
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeSchedulePage() {
  console.log('🔍 COEX 행사 일정 페이지 분석 중...\n');
  
  try {
    const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('✅ 페이지 로드 완료\n');
    
    // BlogEventItem 찾기
    const items = $('.BlogEventItem');
    console.log(`📋 BlogEventItem: ${items.length}개 발견\n`);
    
    // 첫 5개 분석
    items.slice(0, 5).each((idx, el) => {
      const $el = $(el);
      
      console.log(`\n--- 행사 ${idx + 1} ---`);
      
      // 이미지
      const img = $el.find('.BlogEventItemHover img').first();
      console.log(`이미지 src: ${img.attr('src')}`);
      
      // 제목 - 여러 선택자 시도
      const title1 = $el.find('.BlogEventItemCont-title h4').text().trim();
      const title2 = $el.find('.BlogEventItemCont-tit').text().trim();
      const title3 = $el.find('h4').text().trim();
      const title4 = $el.find('.BlogEventItemCont h4').text().trim();
      
      console.log(`제목1 (.BlogEventItemCont-title h4): "${title1}"`);
      console.log(`제목2 (.BlogEventItemCont-tit): "${title2}"`);
      console.log(`제목3 (h4): "${title3}"`);
      console.log(`제목4 (.BlogEventItemCont h4): "${title4}"`);
      
      // 날짜
      const date = $el.find('.BlogEventItemCont-date').text().trim();
      console.log(`날짜: ${date}`);
      
      // 홀
      const hall = $el.find('.BlogEventItemCont-hall').text().trim();
      console.log(`홀: ${hall}`);
    });
    
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

analyzeSchedulePage();
