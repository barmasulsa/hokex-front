/**
 * Test scraping KOBA show website
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testKobaScraping() {
  const url = 'https://www.kobashow.com/ko?utm_source=coexwebkor&utm_medium=button&utm_campaign=5yp67w_46031_general';
  
  console.log(`🔍 Testing KOBA website scraping...\n`);
  console.log(`URL: ${url}\n`);

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    console.log(`✅ Response received (${response.data.length} bytes)\n`);

    const $ = cheerio.load(response.data);

    // Try multiple strategies
    console.log('📊 Testing poster detection strategies:\n');

    // Strategy 1: og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log(`1. og:image: ${ogImage || '❌ Not found'}`);

    // Strategy 2: Look for images with "poster" or "koba" in src/alt
    const posterImages = $('img').filter((_, elem) => {
      const src = $(elem).attr('src') || '';
      const alt = $(elem).attr('alt') || '';
      return src.toLowerCase().includes('poster') || 
             src.toLowerCase().includes('koba') ||
             alt.toLowerCase().includes('poster') ||
             alt.toLowerCase().includes('koba');
    });

    console.log(`\n2. Images with "poster" or "koba": ${posterImages.length} found`);
    posterImages.each((i, elem) => {
      console.log(`   ${i + 1}. src: ${$(elem).attr('src')}`);
      console.log(`      alt: ${$(elem).attr('alt')}`);
    });

    // Strategy 3: All images
    const allImages = $('img');
    console.log(`\n3. Total images on page: ${allImages.length}`);
    
    // Show first 10 images
    console.log('\n   First 10 images:');
    allImages.slice(0, 10).each((i, elem) => {
      const src = $(elem).attr('src');
      const alt = $(elem).attr('alt');
      console.log(`   ${i + 1}. ${src}`);
      if (alt) console.log(`      alt: ${alt}`);
    });

    // Strategy 4: Look for main/hero images
    const heroImages = $('.hero img, .main-image img, .banner img, [class*="visual"] img, [class*="main"] img');
    console.log(`\n4. Hero/Main images: ${heroImages.length} found`);
    heroImages.each((i, elem) => {
      console.log(`   ${i + 1}. ${$(elem).attr('src')}`);
    });

    // Strategy 5: Check for background images in style attributes
    const bgImages = $('[style*="background"]').filter((_, elem) => {
      const style = $(elem).attr('style') || '';
      return style.includes('url(');
    });

    console.log(`\n5. Elements with background images: ${bgImages.length} found`);
    bgImages.slice(0, 5).each((i, elem) => {
      const style = $(elem).attr('style');
      const urlMatch = style?.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch) {
        console.log(`   ${i + 1}. ${urlMatch[1]}`);
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testKobaScraping();
