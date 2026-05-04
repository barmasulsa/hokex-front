/**
 * Test Excel download and check date range
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function testDownload() {
  console.log('📥 Downloading COEX Excel file...\n');

  const downloader = new ExcelDownloader();
  
  // Download 1 year of data (2026-01-01 to 2026-12-31)
  const startDate = '2026.01.01';
  const endDate = '2026.12.31';
  
  const filePath = await downloader.downloadCoexSchedule(
    startDate,
    endDate
  );

  console.log(`✅ Downloaded: ${filePath}\n`);

  // Parse Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Total events in Excel: ${data.length}\n`);

  // Group by month
  const byMonth: Record<string, any[]> = {};
  
  data.forEach((row: any) => {
    const startDate = row['행사시작일'];
    if (startDate) {
      const month = startDate.substring(0, 7); // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = [];
      }
      byMonth[month].push(row);
    }
  });

  // Sort months
  const sortedMonths = Object.keys(byMonth).sort();

  console.log('📅 Events by month:\n');
  sortedMonths.forEach(month => {
    const events = byMonth[month];
    console.log(`${month}: ${events.length}개 행사`);
    
    // Show first 3 events
    events.slice(0, 3).forEach((event, i) => {
      console.log(`   ${i + 1}. ${event['행사명']}`);
    });
    if (events.length > 3) {
      console.log(`   ... and ${events.length - 3} more`);
    }
    console.log('');
  });

  // Check Jan-Apr specifically
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Jan-Apr 2026 Summary:\n');
  
  const janApr = ['2026-01', '2026-02', '2026-03', '2026-04'];
  let total = 0;
  
  janApr.forEach(month => {
    const count = byMonth[month]?.length || 0;
    total += count;
    console.log(`${month}: ${count}개`);
  });
  
  console.log(`\nTotal (Jan-Apr): ${total}개 행사`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testDownload();
