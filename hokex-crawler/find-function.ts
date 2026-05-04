/**
 * download_exhibitions 함수 찾기
 */

import axios from 'axios';

async function findFunction() {
  console.log('🔍 download_exhibitions() 함수 찾는 중...\n');
  
  try {
    const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    
    // download_exhibitions 함수 찾기
    const functionMatch = html.match(/function\s+download_exhibitions\s*\([^)]*\)\s*{[^}]*}/);
    
    if (functionMatch) {
      console.log('✅ 함수 발견!\n');
      console.log(functionMatch[0]);
    } else {
      // 다른 형태로 정의되었을 수 있음
      console.log('⚠️  function 키워드로 찾지 못함. 다른 패턴 시도...\n');
      
      // download_exhibitions가 포함된 모든 줄 찾기
      const lines = html.split('\n');
      let foundLines: string[] = [];
      let inFunction = false;
      let braceCount = 0;
      
      lines.forEach((line, i) => {
        if (line.includes('download_exhibitions')) {
          inFunction = true;
          foundLines.push(`${i + 1}: ${line}`);
        }
        
        if (inFunction) {
          // 중괄호 카운트
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          if (braceCount === 0 && foundLines.length > 0) {
            inFunction = false;
          }
          
          if (inFunction && !line.includes('download_exhibitions')) {
            foundLines.push(`${i + 1}: ${line}`);
          }
        }
        
        // 최대 50줄까지만
        if (foundLines.length > 50) {
          inFunction = false;
        }
      });
      
      if (foundLines.length > 0) {
        console.log('📋 download_exhibitions 관련 코드:\n');
        foundLines.forEach(line => console.log(line));
      }
    }
    
    // 추가로 .xls 또는 download 관련 URL 패턴 찾기
    console.log('\n\n🎯 Excel/Download 관련 URL 패턴:\n');
    
    const xlsMatches = html.match(/['"]([^'"]*\.xls[x]?[^'"]*)['"]/gi);
    if (xlsMatches) {
      xlsMatches.forEach(match => console.log(`   ${match}`));
    }
    
    const downloadMatches = html.match(/['"]([^'"]*download[^'"]*)['"]/gi);
    if (downloadMatches) {
      console.log('\n다운로드 관련 URL:');
      downloadMatches.slice(0, 20).forEach(match => {
        if (match.includes('http') || match.includes('/')) {
          console.log(`   ${match}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

findFunction();
