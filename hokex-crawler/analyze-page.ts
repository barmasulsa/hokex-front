/**
 * COEX 페이지 소스 분석
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzePage() {
  console.log('🔍 COEX 페이지 분석 중...\n');
  
  try {
    const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('✅ 페이지 로드 완료\n');
    
    // 다운로드 관련 링크/버튼 찾기
    console.log('📋 다운로드 관련 요소 찾기:\n');
    
    // 1. "다운로드" 텍스트가 포함된 모든 링크
    $('a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      const onclick = $(el).attr('onclick');
      
      if (text.includes('다운로드') || text.includes('엑셀') || text.includes('일정')) {
        console.log(`\n🔗 링크 ${i + 1}:`);
        console.log(`   텍스트: "${text}"`);
        console.log(`   href: ${href}`);
        console.log(`   onclick: ${onclick}`);
        console.log(`   전체: ${$.html(el)}`);
      }
    });
    
    // 2. "다운로드" 텍스트가 포함된 모든 버튼
    $('button').each((i, el) => {
      const text = $(el).text().trim();
      const onclick = $(el).attr('onclick');
      const dataUrl = $(el).attr('data-url');
      
      if (text.includes('다운로드') || text.includes('엑셀') || text.includes('일정')) {
        console.log(`\n🔘 버튼 ${i + 1}:`);
        console.log(`   텍스트: "${text}"`);
        console.log(`   onclick: ${onclick}`);
        console.log(`   data-url: ${dataUrl}`);
        console.log(`   전체: ${$.html(el)}`);
      }
    });
    
    // 3. JavaScript 함수 찾기
    console.log('\n\n📜 JavaScript 코드에서 다운로드 관련 함수 찾기:\n');
    
    $('script').each((i, el) => {
      const scriptContent = $(el).html() || '';
      
      if (
        scriptContent.includes('download') ||
        scriptContent.includes('다운로드') ||
        scriptContent.includes('excel') ||
        scriptContent.includes('.xls')
      ) {
        console.log(`\n--- Script ${i + 1} ---`);
        // 다운로드 관련 부분만 추출
        const lines = scriptContent.split('\n');
        lines.forEach((line, lineNum) => {
          if (
            line.includes('download') ||
            line.includes('다운로드') ||
            line.includes('excel') ||
            line.includes('.xls') ||
            line.includes('href') ||
            line.includes('window.location')
          ) {
            console.log(`${lineNum + 1}: ${line.trim()}`);
          }
        });
      }
    });
    
    // 4. API 엔드포인트 패턴 찾기
    console.log('\n\n🎯 가능한 API 엔드포인트:\n');
    
    const allText = html;
    const urlPatterns = [
      /\/api\/[^\s"'<>]*/g,
      /\/download\/[^\s"'<>]*/g,
      /\/excel\/[^\s"'<>]*/g,
      /\/schedule\/[^\s"'<>]*/g,
      /https?:\/\/[^\s"'<>]*download[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]*excel[^\s"'<>]*/gi,
    ];
    
    const foundUrls = new Set<string>();
    
    urlPatterns.forEach(pattern => {
      const matches = allText.match(pattern);
      if (matches) {
        matches.forEach(url => {
          if (url.length > 5 && url.length < 200) {
            foundUrls.add(url);
          }
        });
      }
    });
    
    foundUrls.forEach(url => {
      console.log(`   ${url}`);
    });
    
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

analyzePage();
