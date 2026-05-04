/**
 * COEX 페이지에서 주최/주관 정보 크롤링 테스트
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testCoexOrganizer() {
  const url = 'https://www.coex.co.kr/exhibitions/2025-%ec%bd%94%eb%b2%a0-%eb%b2%a0%ec%9d%b4%eb%b9%84%ed%8e%98%ec%96%b4/';
  
  console.log('=== COEX 페이지 주최/주관 정보 크롤링 테스트 ===\n');
  console.log(`URL: ${url}\n`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log('📋 페이지 정보 추출:\n');

    // 다양한 셀렉터 시도
    console.log('=== 시도 1: 제목 찾기 ===');
    $('h1, h2, h3, .title, .event-title').each((_, el) => {
      const text = $(el).text().trim();
      if (text) console.log(`  ${$(el).prop('tagName')}: ${text.substring(0, 100)}`);
    });

    console.log('\n=== 시도 2: 주최/주관 키워드 검색 ===');
    $('*').each((_, el) => {
      const text = $(el).text();
      if (text.includes('주최') || text.includes('주관') || text.includes('메쎄이상')) {
        const tagName = $(el).prop('tagName');
        const className = $(el).attr('class') || '';
        console.log(`  ${tagName}.${className}: ${text.substring(0, 150).replace(/\s+/g, ' ')}`);
      }
    });

    console.log('\n=== 시도 3: 테이블/리스트 구조 ===');
    $('table, ul, dl').each((_, el) => {
      const text = $(el).text();
      if (text.includes('주최') || text.includes('주관')) {
        console.log(`  ${$(el).prop('tagName')}: ${text.substring(0, 200).replace(/\s+/g, ' ')}`);
      }
    });

  } catch (error: any) {
    console.error('❌ 크롤링 실패:', error.message);
  }
}

testCoexOrganizer();
