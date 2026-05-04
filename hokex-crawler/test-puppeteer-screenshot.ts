/**
 * Test Puppeteer screenshot scraper
 */

import { PuppeteerScreenshotScraper } from './src/services/puppeteer-screenshot-scraper';

async function test() {
  console.log('🧪 Testing Puppeteer Screenshot Scraper\n');

  const scraper = new PuppeteerScreenshotScraper();

  try {
    // Test with KOBA website
    const url = 'https://www.kobashow.com/ko';
    const eventTitle = '제 34회 국제 방송 미디어 음향 조명 전시회';

    console.log(`📋 Event: ${eventTitle}`);
    console.log(`🔗 URL: ${url}\n`);

    const result = await scraper.capturePoster(url, eventTitle);

    if (result.posterUrl) {
      console.log(`\n✅ Success!`);
      console.log(`📸 Poster URL: ${result.posterUrl}`);
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

test();
