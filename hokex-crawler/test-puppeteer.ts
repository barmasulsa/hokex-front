/**
 * Puppeteer 작동 테스트
 */

import puppeteer from 'puppeteer';

async function testPuppeteer() {
  console.log('=== Puppeteer 테스트 시작 ===\n');

  try {
    console.log('브라우저 실행 중...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('✅ 브라우저 실행 성공\n');

    const page = await browser.newPage();
    console.log('페이지 생성 완료\n');

    console.log('COEX 페이지 접속 중...');
    await page.goto('https://www.coex.co.kr/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ 페이지 로딩 성공\n');

    const title = await page.title();
    console.log(`페이지 제목: ${title}\n`);

    await browser.close();
    console.log('✅ Puppeteer 정상 작동');

  } catch (error) {
    console.error('❌ Puppeteer 오류:', error);
  }
}

testPuppeteer();
