/**
 * 실패한 행사 디버깅
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugEvent() {
  const url = 'https://www.coex.co.kr/exhibitions/2026-한국수입엑스포/';
  
  console.log(`페이지 확인: ${url}\n`);
  
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(response.data);
  
  // SingleScheduleTitle 구조 확인
  console.log('=== SingleScheduleTitle 구조 ===\n');
  $('.SingleScheduleTitle').each((_, elem) => {
    const title = $(elem).text().trim();
    console.log(`제목: ${title}`);
    
    const nextDiv = $(elem).next('div');
    if (nextDiv.length > 0) {
      console.log(`다음 div: ${nextDiv.text().trim()}`);
    }
    console.log('---\n');
  });
  
  // "장소" 텍스트 검색
  console.log('\n=== "장소" 텍스트 검색 ===\n');
  $('*').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.includes('장소') && text.length < 100) {
      console.log(`텍스트: ${text}`);
      console.log(`태그: <${elem.tagName}> 클래스: ${$(elem).attr('class') || ''}`);
      console.log('---\n');
    }
  });
}

debugEvent().catch(console.error);
