/**
 * SETEC 행사 상세 페이지 구조 분석
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function analyzeSetecDetailPage() {
  const testEventId = '2280'; // 제3회 2026 관상어 파충류 박람회
  const url = `https://www.setec.or.kr/front/schedule/view.do?sIdx=${testEventId}`;
  
  console.log(`🔍 SETEC 상세 페이지 분석: ${url}\n`);

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    fs.writeFileSync('setec-detail-page.html', html, 'utf-8');
    console.log('✅ HTML 저장 완료: setec-detail-page.html\n');

    const $ = cheerio.load(html);

    // 페이지 구조 분석
    console.log('=== 페이지 구조 분석 ===\n');
    
    // 제목
    const title = $('h2, h3, .title, .event_title').first().text().trim();
    console.log(`제목: ${title}\n`);

    // 행사 소개/설명
    const description = $('.content, .description, .event_content, .txt_area').first().text().trim();
    console.log(`행사 소개 (첫 200자):\n${description.substring(0, 200)}...\n`);

    // 주최/주관
    console.log('주최/주관 정보:');
    $('*:contains("주최"), *:contains("주관")').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length < 100) {
        console.log(`  ${text}`);
      }
    });
    console.log();

    // 문의
    console.log('문의 정보:');
    $('*:contains("문의"), *:contains("연락처"), *:contains("Tel"), *:contains("Email")').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length < 100) {
        console.log(`  ${text}`);
      }
    });
    console.log();

    // 입장료
    console.log('입장료 정보:');
    $('*:contains("입장료"), *:contains("관람료"), *:contains("무료")').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length < 100) {
        console.log(`  ${text}`);
      }
    });
    console.log();

    // 공식 웹사이트
    console.log('링크 정보:');
    $('a[href^="http"]').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (href && !href.includes('setec.or.kr') && text.length < 50) {
        console.log(`  ${text}: ${href}`);
      }
    });

  } catch (error) {
    console.error('❌ 분석 실패:', error);
  }
}

analyzeSetecDetailPage();
