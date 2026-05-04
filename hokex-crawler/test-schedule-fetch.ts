/**
 * Test fetching COEX full schedule page
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function testScheduleFetch() {
  console.log('🔍 Fetching COEX full schedule page...\n');

  try {
    const params = {
      search_keyword: '',
      search_type: '',
      search_start_date: '2026.01.01',
      search_end_date: '2026.12.31',
      search_dept: '33',
      list_type: 'LIST'
    };

    const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    console.log(`✅ Response received`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    console.log(`   Content length: ${response.data.length} bytes\n`);

    // Save HTML for inspection
    fs.writeFileSync('schedule-page.html', response.data);
    console.log('💾 Saved HTML to schedule-page.html\n');

    // Parse events
    const $ = cheerio.load(response.data);

    console.log('📊 Parsing events...\n');

    const events: any[] = [];

    $('.BlogEventItem').each((_, elem) => {
      const title = $(elem).find('.BlogEventItemCont-tit').first().text().trim();
      const posterUrl = $(elem).find('img').first().attr('src');
      const dateText = $(elem).find('.BlogEventItemCont-date').first().text().trim();
      const hall = $(elem).find('.BlogEventItemCont-place').first().text().trim();

      if (title) {
        events.push({ title, posterUrl, dateText, hall });
      }
    });

    console.log(`✅ Found ${events.length} events:\n`);

    events.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   Date: ${event.dateText}`);
      console.log(`   Hall: ${event.hall}`);
      console.log(`   Poster: ${event.posterUrl ? '✅' : '❌'}\n`);
    });

    // Check if there's pagination or load more button
    console.log('\n🔍 Checking for pagination/load more...\n');

    const loadMoreButton = $('.load-more, .btn-more, [class*="more"], [class*="load"]');
    console.log(`Load more buttons found: ${loadMoreButton.length}`);

    const pagination = $('.pagination, .paging, [class*="page"]');
    console.log(`Pagination elements found: ${pagination.length}`);

    // Check for AJAX loading indicators
    const ajaxIndicators = $('[data-ajax], [data-load], [data-url]');
    console.log(`AJAX indicators found: ${ajaxIndicators.length}\n`);

    if (ajaxIndicators.length > 0) {
      console.log('AJAX elements:');
      ajaxIndicators.each((i, elem) => {
        console.log(`  ${i + 1}. ${$(elem).attr('class')}`);
        console.log(`     data-ajax: ${$(elem).attr('data-ajax')}`);
        console.log(`     data-load: ${$(elem).attr('data-load')}`);
        console.log(`     data-url: ${$(elem).attr('data-url')}\n`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${error.response.data?.substring(0, 200)}`);
    }
  }
}

testScheduleFetch();
