/**
 * 간단한 다운로드 테스트
 */

import { ExcelDownloader } from './src/services/excel-downloader';

async function testDownload() {
  console.log('🧪 다운로드 테스트 시작...\n');
  
  const downloader = new ExcelDownloader();
  
  try {
    const result = await downloader.downloadCoexSchedule();
    console.log(`\n✅ 성공! 파일 경로: ${result}\n`);
  } catch (error) {
    console.error(`\n❌ 실패:`, error);
  }
}

testDownload();
