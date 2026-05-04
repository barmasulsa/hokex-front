/**
 * 웨딩 박람회와 백상예술대상의 행사분야 확인
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import { ExcelParser } from './src/core/excel-parser';
import * as fs from 'fs';

async function checkIndustry() {
  const downloader = new ExcelDownloader();
  const excelParser = new ExcelParser();
  
  console.log('📥 COEX 일정 다운로드 중...\n');
  
  const filePath = await downloader.downloadCoexSchedule();
  const fileBuffer = fs.readFileSync(filePath);
  
  const parseOptions = {
    columnMapping: {
      title: '행사명',
      startDate: '행사 시작일자',
      endDate: '행사 종료일자',
      category: '행사구분',
      industry: '행사분야',
      organizer: '주최',
      admissionFee: '입장료',
      contact: '담당자/공연문의 정보',
      targetLink: '관련 사이트'
    },
    fileFormat: 'xls' as const
  };
  
  const rawEvents = excelParser.parseExcelFile(fileBuffer, parseOptions);
  
  console.log('🔍 웨딩 박람회 찾기:\n');
  const weddingEvents = rawEvents.filter(e => e.title.includes('웨딩') || e.title.includes('결혼'));
  weddingEvents.forEach(e => {
    console.log(`제목: ${e.title}`);
    console.log(`행사구분: ${e.category}`);
    console.log(`행사분야: ${e.industry}`);
    console.log(`관련 사이트: ${e.targetLink}`);
    console.log('---');
  });
  
  console.log('\n🔍 백상예술대상 찾기:\n');
  const baeksangEvents = rawEvents.filter(e => e.title.includes('백상'));
  baeksangEvents.forEach(e => {
    console.log(`제목: ${e.title}`);
    console.log(`행사구분: ${e.category}`);
    console.log(`행사분야: ${e.industry}`);
    console.log(`관련 사이트: ${e.targetLink}`);
    console.log('---');
  });
}

checkIndustry();
