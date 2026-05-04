/**
 * Analyze COEX schedule page to find the API endpoint for filtered events
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeScheduleAPI() {
  console.log('🔍 Analyzing COEX schedule page...\n');

  try {
    // Fetch the schedule page
    const response = await axios.get('https://www.coex.co.kr/blog-event', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Find all script tags
    console.log('📜 Searching for JavaScript files...\n');

    const scriptUrls: string[] = [];
    $('script[src]').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        scriptUrls.push(src);
      }
    });

    console.log(`Found ${scriptUrls.length} script files:\n`);
    scriptUrls.forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });

    // Look for inline scripts with AJAX calls
    console.log('\n\n🔍 Searching for AJAX calls in inline scripts...\n');

    const inlineScripts: string[] = [];
    $('script:not([src])').each((_, elem) => {
      const content = $(elem).html();
      if (content && (
        content.includes('ajax') ||
        content.includes('fetch') ||
        content.includes('XMLHttpRequest') ||
        content.includes('blog-event') ||
        content.includes('exhibition')
      )) {
        inlineScripts.push(content);
      }
    });

    console.log(`Found ${inlineScripts.length} relevant inline scripts\n`);

    // Search for API endpoints
    const apiPatterns = [
      /admin-ajax\.php/g,
      /wp-json\/[^\s"']+/g,
      /\/api\/[^\s"']+/g,
      /action:\s*['"]([^'"]+)['"]/g,
      /url:\s*['"]([^'"]+)['"]/g,
    ];

    const foundEndpoints = new Set<string>();

    for (const script of inlineScripts) {
      for (const pattern of apiPatterns) {
        const matches = script.match(pattern);
        if (matches) {
          matches.forEach(match => foundEndpoints.add(match));
        }
      }
    }

    if (foundEndpoints.size > 0) {
      console.log('✅ Found potential API endpoints:\n');
      foundEndpoints.forEach(endpoint => {
        console.log(`   - ${endpoint}`);
      });
    }

    // Look for date filter logic
    console.log('\n\n🔍 Searching for date filter logic...\n');

    for (const script of inlineScripts) {
      if (script.includes('2026') || script.includes('date') || script.includes('filter')) {
        console.log('Found date-related script:\n');
        console.log(script.substring(0, 500) + '...\n');
        break;
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

analyzeScheduleAPI();
