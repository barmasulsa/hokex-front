/**
 * Excel 파일에서 특정 이벤트 찾기
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import { ExcelParser } from './src/core/excel-parser';
import * as fs from 'fs';

async function findEventsInExcel() {
  const downloader = new ExcelDownloader();
  const parser = new ExcelParser();

  // 1년치 데이터 다운로드
  const today = new Date();
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(today.getFullYear() + 1);

  const startDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const endDate = `${oneYearLater.getFullYear()}.${String(oneYearLater.getMonth() + 1).padStart(2, '0')}.${String(oneYearLater.getDate()).padStart(2, '0')}`;

  const filePath = await downloader.downloadCoexSchedule(startDate, endDate);
  
  // Excel 파일 읽기
  const fileBuffer = fs.readFileSync(filePath);
  const rawEvents = parser.parseExcelFile(fileBuffer, {
    columnMapping: {
      title: '행사명',
      startDate: '행사 시작일자',
      endDate: '행사 종료일자',
      category: '행사구분',
      industry: '행사분야',
      organizer: '주최',
      targetLink: '관련 사이트'
    },
    fileFormat: 'xls'
  });

  console.log(`\n총 ${rawEvents.length}개 행사 발견\n`);

  // 특정 이벤트 찾기
  const target1 = rawEvents.find(e => e.title.includes('제415회') && e.title.includes('웨덱스'));
  const target2 = rawEvents.find(e => e.title === '2026 유학박람회');

  console.log('1️⃣  제415회 웨덱스 웨딩박람회:');
  if (target1) {
    console.log(`✅ 발견!`);
    console.log(`제목: ${target1.title}`);
    console.log(`행사분야: ${target1.category}`);
    console.log(`행사품목: ${target1.industry}`);
  } else {
    console.log(`❌ Excel 파일에 없음 (이전 행사일 가능성)`);
  }

  console.log('\n2️⃣  2026 유학박람회:');
  if (target2) {
    console.log(`✅ 발견!`);
    console.log(`제목: ${target2.title}`);
    console.log(`행사분야: ${target2.category}`);
    console.log(`행사품목: ${target2.industry}`);
  } else {
    console.log(`❌ Excel 파일에 없음 (이전 행사일 가능성)`);
  }
}

findEventsInExcel().catch(console.error);
