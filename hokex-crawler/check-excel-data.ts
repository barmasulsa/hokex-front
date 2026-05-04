/**
 * Excel 원본 데이터 확인
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import { ExcelParser } from './src/core/excel-parser';

async function checkExcelData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Excel 원본 데이터 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const downloader = new ExcelDownloader();
  const parser = new ExcelParser();

  // 1년치 데이터 다운로드
  const today = new Date();
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(today.getFullYear() + 1);

  const startDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const endDate = `${oneYearLater.getFullYear()}.${String(oneYearLater.getMonth() + 1).padStart(2, '0')}.${String(oneYearLater.getDate()).padStart(2, '0')}`;

  const filePath = await downloader.downloadCoexSchedule(startDate, endDate);
  const rawEvents = parser.parse(filePath);

  // 웨딩 관련 행사 찾기
  console.log('1️⃣  웨딩 관련 행사 원본 데이터:');
  const weddingEvents = rawEvents.filter(e => e.title.includes('웨딩'));
  weddingEvents.forEach(event => {
    console.log(`\n제목: ${event.title}`);
    console.log(`행사분야(category): ${event.category}`);
    console.log(`행사품목(industry): ${event.industry}`);
  });

  // 유학 관련 행사 찾기
  console.log('\n\n2️⃣  유학 관련 행사 원본 데이터:');
  const studyEvents = rawEvents.filter(e => e.title.includes('유학'));
  studyEvents.forEach(event => {
    console.log(`\n제목: ${event.title}`);
    console.log(`행사분야(category): ${event.category}`);
    console.log(`행사품목(industry): ${event.industry}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

checkExcelData().catch(console.error);
