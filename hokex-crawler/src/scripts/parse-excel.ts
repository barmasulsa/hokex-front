/**
 * Excel 파일 파싱 스크립트
 * 샘플 데이터 폴더의 엑셀 파일을 읽어서 파싱
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExcelParser } from '../core/excel-parser';
import { DataNormalizer } from '../core/normalizer';
import { DataValidator } from '../core/validator';

const excelParser = new ExcelParser();
const normalizer = new DataNormalizer();
const validator = new DataValidator();

async function parseExcelFile(venueCode: string) {
  try {
    console.log(`\n📂 ${venueCode} 엑셀 파일 파싱 시작...\n`);

    // 파일 경로
    const filePath = path.join(__dirname, '../../sample-data', `${venueCode}_schedule.xlsx`);
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      console.log(`\n💡 다음 위치에 파일을 저장해주세요:`);
      console.log(`   ${filePath}\n`);
      return;
    }

    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 파일 로드 완료: ${filePath}`);

    // 시트 이름 확인
    const sheetNames = excelParser.getSheetNames(fileBuffer);
    console.log(`\n📋 시트 목록:`, sheetNames);

    // 첫 번째 시트 파싱 (임시 컬럼 매핑)
    const parseOptions = {
      columnMapping: {
        title: '행사명',
        startDate: '시작일',
        endDate: '종료일',
        category: '구분',
        industry: '산업',
        organizer: '주최',
        description: '설명',
        posterUrl: '포스터'
      },
      fileFormat: 'xlsx' as const
    };

    console.log(`\n🔍 엑셀 파싱 중...`);
    const rawEvents = excelParser.parseExcelFile(fileBuffer, parseOptions);
    console.log(`✅ ${rawEvents.length}개 행사 데이터 추출 완료`);

    // 처음 3개만 출력
    console.log(`\n📊 샘플 데이터 (처음 3개):\n`);
    rawEvents.slice(0, 3).forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   기간: ${event.startDate} ~ ${event.endDate}`);
      console.log(`   카테고리: ${event.category || 'N/A'}`);
      console.log(`   산업: ${event.industry || 'N/A'}`);
      console.log(``);
    });

    // 데이터 정규화 및 검증
    console.log(`\n🔄 데이터 정규화 및 검증 중...\n`);
    let validCount = 0;
    let invalidCount = 0;

    for (const rawEvent of rawEvents.slice(0, 5)) {
      try {
        // 정규화
        const normalized = normalizer.normalize(rawEvent, venueCode);
        
        // 검증
        const validationResult = validator.validate(normalized);
        
        if (validationResult.isValid) {
          validCount++;
          console.log(`✅ ${normalized.title}`);
        } else {
          invalidCount++;
          console.log(`❌ ${rawEvent.title}`);
          validationResult.errors.forEach(err => {
            console.log(`   - ${err.message}`);
          });
        }
      } catch (error) {
        invalidCount++;
        console.log(`❌ ${rawEvent.title}`);
        console.log(`   - 에러: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`\n📈 검증 결과:`);
    console.log(`   유효: ${validCount}개`);
    console.log(`   무효: ${invalidCount}개`);
    console.log(`   전체: ${rawEvents.length}개\n`);

    console.log(`\n✨ 파싱 완료!\n`);
    console.log(`다음 단계:`);
    console.log(`1. 컬럼 매핑 확인 및 수정`);
    console.log(`2. Supabase 연동`);
    console.log(`3. 데이터 저장\n`);

  } catch (error) {
    console.error(`\n❌ 에러 발생:`, error);
  }
}

// 커맨드 라인 인자로 전시장 코드 받기
const venueCode = process.argv[2] || 'COEX';
parseExcelFile(venueCode);
