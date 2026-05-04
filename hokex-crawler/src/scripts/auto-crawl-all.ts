/**
 * 전체 전시장 자동 크롤링 통합 스크립트
 * COEX + SETEC 순차 실행
 */

import { execSync } from 'child_process';

async function autoCrawlAll() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        전시장 자동 크롤링 시작                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}\n`);

  try {
    // 1. COEX 크롤링
    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│  1/2: COEX 크롤링                                      │');
    console.log('└────────────────────────────────────────────────────────┘\n');
    
    execSync('npx tsx src/scripts/auto-crawl-coex.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('\n✅ COEX 크롤링 완료\n');

    // 2. SETEC 크롤링
    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│  2/2: SETEC 크롤링                                     │');
    console.log('└────────────────────────────────────────────────────────┘\n');
    
    execSync('npx tsx src/scripts/auto-crawl-setec.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('\n✅ SETEC 크롤링 완료\n');

    // 완료
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        전체 크롤링 완료!                               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('🌐 웹사이트: https://hokex-front.vercel.app/\n');

  } catch (error) {
    console.error('\n❌ 크롤링 실패:', error);
    process.exit(1);
  }
}

autoCrawlAll();
