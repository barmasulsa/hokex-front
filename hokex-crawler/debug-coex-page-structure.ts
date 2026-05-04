/**
 * COEX 페이지 구조 디버깅
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugCoexPage() {
  const url = 'https://www.coex.co.kr/exhibitions/2025-코베-베이비페어/?var_page=1&search_start_date=2026.05.03&search_end_date=2026.07.17&list_type=LIST';
  
  try {
    console.log(`🔍 페이지 구조 분석: ${url}\n`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // HTML 저장
    fs.writeFileSync('coex-baby-fair-page.html', html, 'utf-8');
    console.log('✅ HTML 저장: coex-baby-fair-page.html\n');

    // 페이지 제목
    console.log('📄 페이지 제목:', $('title').text());
    console.log('📄 H1:', $('h1').text());
    console.log();

    // 모든 테이블 찾기
    console.log('📊 테이블 구조:');
    $('table').each((i, table) => {
      console.log(`\n테이블 ${i + 1}:`);
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('th, td').map((_, cell) => $(cell).text().trim()).get();
        if (cells.length > 0) {
          console.log(`  ${cells.join(' | ')}`);
        }
      });
    });

    // 모든 리스트 찾기
    console.log('\n\n📋 리스트 구조:');
    $('ul, ol').each((i, list) => {
      const $list = $(list);
      const className = $list.attr('class') || '(no class)';
      console.log(`\n리스트 ${i + 1} (${className}):`);
      $list.find('li').slice(0, 5).each((j, item) => {
        console.log(`  - ${$(item).text().trim().substring(0, 100)}`);
      });
    });

    // dl/dt/dd 구조 찾기
    console.log('\n\n📝 DL 구조:');
    $('dl').each((i, dl) => {
      console.log(`\nDL ${i + 1}:`);
      $(dl).find('dt').each((j, dt) => {
        const $dt = $(dt);
        const $dd = $dt.next('dd');
        console.log(`  ${$dt.text().trim()}: ${$dd.text().trim()}`);
      });
    });

    // 클래스에 'info', 'detail', 'content' 포함된 요소들
    console.log('\n\n🔍 정보 관련 요소들:');
    $('[class*="info"], [class*="detail"], [class*="content"]').each((i, elem) => {
      const $elem = $(elem);
      const className = $elem.attr('class');
      const text = $elem.text().trim().substring(0, 150);
      if (text.length > 0) {
        console.log(`\n${$elem.prop('tagName')}.${className}:`);
        console.log(`  ${text}...`);
      }
    });

  } catch (error: any) {
    console.error('❌ 에러:', error.message);
  }
}

debugCoexPage();
