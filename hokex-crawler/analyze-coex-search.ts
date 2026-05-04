/**
 * Analyze COEX search functionality
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeCoexSearch() {
  console.log('🔍 Analyzing COEX search functionality...\n');

  try {
    // Try searching for a known event
    const searchQuery = '웨딩박람회';
    const searchUrl = `https://www.coex.co.kr/?s=${encodeURIComponent(searchQuery)}`;

    console.log(`📍 Search URL: ${searchUrl}\n`);

    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('✅ Search page loaded\n');

    // Try to find search results
    console.log('🔍 Looking for search results...\n');

    // Common search result selectors
    const selectors = [
      '.search-results',
      '.search-result',
      'article',
      '.post',
      '.entry',
      '.result',
      '.BlogEventItem'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}\n`);

        // Show first 3 results
        elements.slice(0, 3).each((i, elem) => {
          console.log(`--- Result ${i + 1} ---`);
          console.log(`Title: ${$(elem).find('h1, h2, h3, h4, h5').first().text().trim()}`);
          console.log(`Link: ${$(elem).find('a').first().attr('href')}`);
          console.log(`Text: ${$(elem).text().trim().substring(0, 100)}...\n`);
        });
      }
    }

    // Check if there's a "no results" message
    const bodyText = $('body').text();
    if (bodyText.includes('검색 결과가 없습니다') || bodyText.includes('No results')) {
      console.log('❌ No search results found\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

analyzeCoexSearch().catch(console.error);
