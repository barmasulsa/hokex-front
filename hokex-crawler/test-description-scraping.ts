/**
 * Test description scraping for events without descriptions
 */

import { PosterScraper } from './src/services/poster-scraper';

async function testDescriptionScraping() {
  const scraper = new PosterScraper();

  // Test events without descriptions
  const testEvents = [
    {
      title: '2026 대한레이저피부모발학회 미용의료기기 박람회 및 춘계학술대회',
      url: 'https://kaldat.co.kr/main',
      venue: 'COEX'
    },
    {
      title: '제62회 백상예술대상',
      url: 'https://www.baeksangawards.co.kr/ko/',
      venue: 'COEX'
    },
    {
      title: '제 34회 국제 방송 · 미디어 · 음향 · 조명 전시회',
      url: 'https://www.kobashow.com/ko?utm_source=coexwebkor&utm_medium=button&utm_campaign=5yp67w_46031_general',
      venue: 'COEX'
    }
  ];

  console.log('🔍 Testing description scraping...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const event of testEvents) {
    console.log(`📋 ${event.title}`);
    console.log(`🔗 URL: ${event.url}\n`);

    // Try COEX page first
    console.log('   Trying COEX page...');
    const coexResult = await scraper.scrapeCoexEventPage(event.title);
    if (coexResult.description) {
      console.log(`   ✅ COEX description: ${coexResult.description.substring(0, 100)}...`);
    } else {
      console.log('   ❌ No description from COEX page');
    }

    // Try event's own website
    console.log('   Trying event website...');
    const websiteResult = await scraper.scrapePostUrl(event.url, event.title, event.venue);
    if (websiteResult.description) {
      console.log(`   ✅ Website description: ${websiteResult.description.substring(0, 100)}...`);
    } else {
      console.log('   ❌ No description from event website');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testDescriptionScraping();
