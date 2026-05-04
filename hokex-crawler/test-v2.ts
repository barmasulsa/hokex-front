/**
 * V2 다운로더 테스트
 */

import { ExcelDownloaderV2 } from './src/services/excel-downloader';

async function test() {
  console.log('🧪 V2 다운로더 테스트 시작...\n');
  
  const downloader = new ExcelDownloaderV2();
  
  try {
    // 현재 날짜부터 1년치 다운로드
    const result = await downloader.downloadCoexSchedule();
    console.log(`\n✅ 성공! 파일: ${result}\n`);
  } catch (error: any) {
    console.error(`\n❌ 실패:`, error.message);
  }
}

test();
