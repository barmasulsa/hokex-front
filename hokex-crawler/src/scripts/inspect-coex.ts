/**
 * COEX Excel 파일 구조 확인 스크립트
 */

import * as fs from 'fs';
import * as xlsx from 'xlsx';

async function inspectCoexExcel() {
  try {
    // 파일 경로 (Downloads 폴더)
    const filePath = 'C:/Users/lcw55/Downloads/Coex_Schedule_20260425194242.xls';
    
    console.log(`\n📂 COEX 엑셀 파일 분석 시작...\n`);
    console.log(`파일: ${filePath}\n`);

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      return;
    }

    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 파일 로드 완료\n`);

    // 워크북 읽기
    const workbook = xlsx.read(fileBuffer, {
      type: 'buffer',
      cellDates: true
    });

    // 시트 목록
    console.log(`📋 시트 목록:`);
    workbook.SheetNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    console.log(``);

    // 첫 번째 시트 분석
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    
    console.log(`🔍 첫 번째 시트 분석: "${firstSheetName}"\n`);

    // JSON으로 변환 (헤더 포함)
    const rows = xlsx.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null
    });

    console.log(`📊 총 행 수: ${rows.length}개\n`);

    if (rows.length > 0) {
      // 첫 번째 행의 컬럼 목록
      const firstRow = rows[0] as Record<string, any>;
      console.log(`📝 컬럼 목록 (${Object.keys(firstRow).length}개):`);
      Object.keys(firstRow).forEach((col, index) => {
        console.log(`   ${index + 1}. "${col}"`);
      });
      console.log(``);

      // 처음 3개 행 샘플 데이터
      console.log(`📄 샘플 데이터 (처음 3개 행):\n`);
      rows.slice(0, 3).forEach((row, index) => {
        console.log(`--- 행 ${index + 1} ---`);
        const rowData = row as Record<string, any>;
        Object.entries(rowData).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });
        console.log(``);
      });
    }

    console.log(`\n✨ 분석 완료!\n`);

  } catch (error) {
    console.error(`\n❌ 에러 발생:`, error);
  }
}

inspectCoexExcel();
