/**
 * Check what titles are in the schedule page
 */

import { ScheduleStrategy } from './src/services/schedule-strategy';

async function checkScheduleTitles() {
  console.log('🔍 Checking schedule page titles...\n');

  const scheduleStrategy = new ScheduleStrategy();
  const scheduleData = await (scheduleStrategy as any).fetchSchedulePage();

  console.log(`✅ Found ${scheduleData.size} events\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let index = 1;
  for (const [normalizedTitle, event] of scheduleData.entries()) {
    console.log(`${index}. ${event.title}`);
    console.log(`   Date: ${event.startDate} ~ ${event.endDate}`);
    console.log(`   Normalized: ${normalizedTitle}`);
    console.log(`   Poster: ${event.posterUrl ? '✅' : '❌'}\n`);
    index++;
  }

  // Check for specific missing events
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Checking for missing events:\n');

  const missingEvents = [
    '제 34회 국제 방송 · 미디어 · 음향 · 조명 전시회',
    '2026 한국수입엑스포',
    '2026 자율주행모빌리티산업전',
    '2026 상표·디자인권展',
    '2027학년도 정시 대학입학정보박람회'
  ];

  for (const title of missingEvents) {
    const normalized = normalizeTitle(title);
    const found = scheduleData.has(normalized);
    console.log(`${found ? '✅' : '❌'} ${title}`);
    console.log(`   Normalized: ${normalized}\n`);
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/&amp;/g, '')
    .replace(/·/g, '')
    .replace(/\//g, '')
    .replace(/-/g, '')
    .replace(/,/g, '')
    .trim();
}

checkScheduleTitles();
