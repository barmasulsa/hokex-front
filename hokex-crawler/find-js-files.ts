/**
 * 페이지의 모든 JavaScript 파일 찾기
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function findJsFiles() {
  console.log('🔍 JavaScript 파일 찾는 중...\n');
  
  try {
    const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('📜 JavaScript 파일 목록:\n');
    
    const jsFiles: string[] = [];
    
    $('script[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        const fullUrl = src.startsWith('http') ? src : `https://www.coex.co.kr${src}`;
        jsFiles.push(fullUrl);
        console.log(`${i + 1}. ${fullUrl}`);
      }
    });
    
    console.log(`\n총 ${jsFiles.length}개의 JavaScript 파일 발견\n`);
    
    // 각 JS 파일에서 download_exhibitions 함수 찾기
    console.log('🔍 각 파일에서 download_exhibitions 함수 찾는 중...\n');
    
    for (const jsUrl of jsFiles) {
      try {
        const jsResponse = await axios.get(jsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 5000
        });
        
        const jsContent = jsResponse.data;
        
        if (jsContent.includes('download_exhibitions')) {
          console.log(`\n✅ 발견! ${jsUrl}\n`);
          
          // 함수 주변 코드 추출
          const lines = jsContent.split('\n');
          let foundLines: string[] = [];
          let capturing = false;
          let braceCount = 0;
          
          lines.forEach((line, i) => {
            if (line.includes('download_exhibitions')) {
              capturing = true;
              // 이전 5줄도 포함
              for (let j = Math.max(0, i - 5); j < i; j++) {
                foundLines.push(`${j + 1}: ${lines[j]}`);
              }
            }
            
            if (capturing) {
              foundLines.push(`${i + 1}: ${line}`);
              
              braceCount += (line.match(/{/g) || []).length;
              braceCount -= (line.match(/}/g) || []).length;
              
              // 함수 끝
              if (braceCount === 0 && foundLines.length > 10) {
                // 다음 5줄도 포함
                for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
                  foundLines.push(`${j + 1}: ${lines[j]}`);
                }
                capturing = false;
              }
            }
            
            if (foundLines.length > 100) {
              capturing = false;
            }
          });
          
          console.log('📋 함수 코드:\n');
          foundLines.forEach(line => console.log(line));
          
          break; // 찾았으면 중단
        }
      } catch (err) {
        // 파일 로드 실패는 무시
      }
    }
    
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

findJsFiles();
