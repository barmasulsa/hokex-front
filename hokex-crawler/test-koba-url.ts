/**
 * Test different KOBA URL variations
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testUrl(url: string, label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(60));

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      maxRedirects: 5
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Content length: ${response.data.length} bytes`);
    console.log(`🔗 Final URL: ${response.request.res.responseUrl || url}`);

    const $ = cheerio.load(response.data);
    
    // Check for images
    const images = $('img');
    console.log(`🖼️  Images found: ${images.length}`);

    if (images.length > 0) {
      console.log('\nFirst 5 images:');
      images.slice(0, 5).each((i, elem) => {
        console.log(`  ${i + 1}. ${$(elem).attr('src')}`);
      });
    }

    // Check og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      console.log(`\n✅ og:image found: ${ogImage}`);
    }

    // Check title
    const title = $('title').text();
    console.log(`\n📝 Page title: ${title}`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Testing KOBA website URL variations...\n');

  // Test different URL variations
  await testUrl(
    'https://www.kobashow.com/ko?utm_source=coexwebkor&amp;utm_medium=button&amp;utm_campaign=5yp67w_46031_general',
    'Original URL (with &amp;)'
  );

  await testUrl(
    'https://www.kobashow.com/ko?utm_source=coexwebkor&utm_medium=button&utm_campaign=5yp67w_46031_general',
    'Fixed URL (with &)'
  );

  await testUrl(
    'https://www.kobashow.com/ko',
    'Base URL (no params)'
  );

  await testUrl(
    'https://www.kobashow.com/',
    'Root URL'
  );
}

main();
