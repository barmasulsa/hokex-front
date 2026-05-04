/**
 * Excel 파일의 컬럼 확인
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function checkExcelColumns() {
  console.log('📥 COEX Excel 파일 다운로드 중...\n');
  
  const downloader = new ExcelDownloader();
  
  // 최근 1개월 데이터만 다운로드
  const now = new Date();
  const startDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endDate = `${oneMonthLater.getFullYear()}.${String(oneMonthLater.getMonth() + 1).padStart(2, '0')}.${String(oneMonthLater.getDate()).padStart(2, '0')}`;
  
  const filePath = await downloader.downloadCoexSchedule(startDate, endDate);
  
  console.log(`\n📄 파일 경로: ${filePath}\n`);
  
  // Excel 파일 읽기
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 첫 번째 행(헤더) 읽기
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  const headers: string[] = [];
  
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    if (cell && cell.v) {
      headers.push(cell.v.toString());
    }
  }
  
  console.log('=== Excel 파일 컬럼 목록 ===\n');
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header}`);
  });
  
  // "전시장" 컬럼이 있는지 확인
  const hasVenueHallColumn = headers.some(h => h.includes('전시장') || h.includes('장소') || h.includes('홀'));
  
  console.log('\n=== 분석 결과 ===');
  console.log(`"전시장" 관련 컬럼 존재: ${hasVenueHallColumn ? '✅ 있음' : '❌ 없음'}`);
  
  if (hasVenueHallColumn) {
    const venueColumns = headers.filter(h => h.includes('전시장') || h.includes('장소') || h.includes('홀'));
    console.log('\n관련 컬럼:');
    venueColumns.forEach(col => console.log(`  - ${col}`));
  }
  
  // 파일 삭제
  fs.unlinkSync(filePath);
  console.log('\n✅ 임시 파일 삭제 완료');
}

checkExcelColumns().catch(console.error);
