/**
 * Extract paging information from schedule page
 */

import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('schedule-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('🔍 Analyzing paging structure...\n');

// Find paging container
const paging = $('.Paging, .paging, [class*="pag"]');
console.log(`Found ${paging.length} paging elements\n`);

// Extract paging HTML
if (paging.length > 0) {
  console.log('Paging HTML:');
  console.log(paging.first().html()?.substring(0, 1000));
  console.log('\n');
}

// Find page links
const pageLinks = $('.PagingList-item a, .page-link, [class*="page"] a');
console.log(`\nFound ${pageLinks.length} page links:\n`);

pageLinks.each((i, elem) => {
  const href = $(elem).attr('href');
  const text = $(elem).text().trim();
  const onclick = $(elem).attr('onclick');
  
  console.log(`${i + 1}. Text: "${text}"`);
  console.log(`   href: ${href}`);
  console.log(`   onclick: ${onclick}\n`);
});

// Check for current page indicator
const currentPage = $('.PagingList-item.active, .page-item.active, [class*="current"]');
console.log(`\nCurrent page indicators: ${currentPage.length}`);

if (currentPage.length > 0) {
  console.log(`Current page: ${currentPage.text().trim()}`);
}

// Look for total pages
const allPageItems = $('.PagingList-item');
console.log(`\nTotal page items: ${allPageItems.length}\n`);

allPageItems.each((i, elem) => {
  const text = $(elem).text().trim();
  const classes = $(elem).attr('class');
  console.log(`${i + 1}. "${text}" - classes: ${classes}`);
});
