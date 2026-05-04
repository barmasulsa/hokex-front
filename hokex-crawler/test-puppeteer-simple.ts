/**
 * Simple Puppeteer test
 */

import puppeteer from 'puppeteer';

async function test() {
  console.log('🧪 Testing Puppeteer (Simple)\n');

  try {
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('✅ Browser launched');

    const page = await browser.newPage();
    console.log('✅ New page created');

    await page.setViewport({ width: 1920, height: 1080 });

    const url = 'https://www.kobashow.com/ko';
    console.log(`\n📄 Loading: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded');

    // Wait for content
    await page.waitForTimeout(3000);

    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    const screenshot = await page.screenshot({ type: 'png' });

    console.log(`✅ Screenshot captured (${screenshot.length} bytes)`);

    await browser.close();
    console.log('\n✅ Test complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

test();
