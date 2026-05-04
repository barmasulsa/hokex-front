/**
 * Excel 파일의 "행사 장소" 컬럼 데이터 확인
 */

import { ExcelDownloader } from './src/services/excel-downloader';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function checkVenueHallData() {
  console.log('📥 COEX Excel 파일 다운로드 중...\n');
  
  const downloader = new ExcelDownloader();
  
  // 최근 3개월 데이터 다운로드
  const now = new Date();
  const startDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const endDate = `${threeMonthsLater.getFullYear()}.${String(threeMonthsLater.getMonth() + 1).padStart(2, '0')}.${String(threeMonthsLater.getDate()).padStart(2, '0')}`;
  
  const filePath = await downloader.downloadCoexSchedule(startDate, endDate);
  
  console.log(`\n📄 파일 경로: ${filePath}\n`);
  
  // Excel 파일 읽기
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSON으로 변환
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`=== 총 ${data.length}개 행사 ===\n`);
  
  // "행사 장소" 컬럼 데이터 샘플 출력
  console.log('=== "행사 장소" 컬럼 샘플 (처음 20개) ===\n');
  
  data.slice(0, 20).forEach((row: any, index) => {
    const title = row['행사명'] || '';
    const venueHall = row['행사 장소'] || '';
    console.log(`${index + 1}. ${title}`);
    console.log(`   행사 장소: ${venueHall || '(없음)'}\n`);
  });
  
  // 통계
  const withVenueHall = data.filter((row: any) => row['행사 장소']).length;
  const withoutVenueHall = data.length - withVenueHall;
  
  console.log('=== 통계 ===');
  console.log(`행사 장소 있음: ${withVenueHall}개 (${(withVenueHall / data.length * 100).toFixed(1)}%)`);
  console.log(`행사 장소 없음: ${withoutVenueHall}개 (${(withoutVenueHall / data.length * 100).toFixed(1)}%)`);
  
  // 파일 삭제
  fs.unlinkSync(filePath);
  console.log('\n✅ 임시 파일 삭제 완료');
}

checkVenueHallData().catch(console.error);
