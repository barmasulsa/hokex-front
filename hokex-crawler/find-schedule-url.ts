/**
 * Find the correct URL for COEX schedule page
 */

import axios from 'axios';

async function findScheduleURL() {
  console.log('🔍 Testing COEX URLs...\n');

  const urlsToTest = [
    'https://www.coex.co.kr/blog-event',
    'https://www.coex.co.kr/blog-event/',
    'https://www.coex.co.kr/event',
    'https://www.coex.co.kr/event/',
    'https://www.coex.co.kr/schedule',
    'https://www.coex.co.kr/schedule/',
    'https://www.coex.co.kr/exhibitions',
    'https://www.coex.co.kr/exhibitions/',
    'https://www.coex.co.kr/ko/blog-event',
    'https://www.coex.co.kr/ko/blog-event/',
    'https://www.coex.co.kr/ko/event',
    'https://www.coex.co.kr/ko/exhibitions',
  ];

  for (const url of urlsToTest) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000,
        maxRedirects: 5
      });

      console.log(`✅ ${url}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Final URL: ${response.request.res.responseUrl || url}`);
      console.log(`   Content length: ${response.data.length} bytes\n`);

    } catch (error: any) {
      console.log(`❌ ${url}`);
      console.log(`   Error: ${error.response?.status || error.message}\n`);
    }
  }
}

findScheduleURL();
