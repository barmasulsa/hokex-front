/**
 * COEX 데이터 로드 스크립트
 * Excel 파일을 파싱하여 Supabase에 저장
 */

import * as fs from 'fs';
import { ExcelParser } from '../core/excel-parser';
import { DataNormalizer } from '../core/normalizer';
import { DataValidator } from '../core/validator';
import { SupabaseService } from '../services/supabase';
import { PosterScraper } from '../services/poster-scraper';
import { NormalizedEventData } from '../types/event';

const excelParser = new ExcelParser();
const normalizer = new DataNormalizer();
const validator = new DataValidator();
const supabase = new SupabaseService();
const posterScraper = new PosterScraper();

async function loadCoexData() {
  try {
    console.log(`\n🚀 COEX 데이터 로드 시작...\n`);

    // 파일 경로
    const filePath = 'C:/Users/lcw55/Downloads/Coex_Schedule_20260502220043.xls';
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      return;
    }

    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 파일 로드 완료\n`);

    // Excel 파싱 옵션 (COEX 컬럼 매핑)
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

    console.log(`🔍 Excel 파싱 중...`);
    const rawEvents = excelParser.parseExcelFile(fileBuffer, parseOptions);
    console.log(`✅ ${rawEvents.length}개 행사 데이터 추출 완료\n`);

    // 데이터 정규화 및 검증
    console.log(`🔄 데이터 정규화 및 검증 중...\n`);
    const validEvents: NormalizedEventData[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawEvent of rawEvents) {
      try {
        // 정규화 (venue code: COEX)
        const normalized = normalizer.normalize(rawEvent, 'COEX');
        
        // 검증
        const validationResult = validator.validate(normalized);
        
        if (validationResult.isValid) {
          validCount++;
          validEvents.push(normalized);
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

    // 포스터 이미지 크롤링
    if (validEvents.length > 0) {
      console.log(`🖼️  포스터 이미지 크롤링 중...\n`);
      
      for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        
        if (event.targetLink) {
          console.log(`${i + 1}/${validEvents.length} ${event.title}`);
          const result = await posterScraper.scrapePostUrl(event.targetLink, event.title, 'COEX');
          
          if (result.posterUrl) {
            event.posterUrl = result.posterUrl;
            console.log(`   ✅ 포스터 발견: ${result.posterUrl.substring(0, 60)}...`);
          }
          if (result.description) event.description = result.description;
          if (result.admissionFee) event.admissionFee = result.admissionFee;
          if (result.exhibitItems) event.exhibitItems = result.exhibitItems;
          if (result.exhibitProducts) event.exhibitProducts = result.exhibitProducts;
          if (result.organizer) event.organizer = result.organizer;
          if (result.contact) event.contact = result.contact;
          if (result.operatingHours) event.operatingHours = result.operatingHours;
          if (result.venueHall) event.venueHall = result.venueHall;
          
          if (!result.posterUrl) {
            console.log(`   ⚠️  포스터 없음`);
          }
        } else {
          console.log(`${i + 1}/${validEvents.length} ${event.title} - 관련 사이트 없음`);
        }
      }
      
      console.log(`\n✅ 포스터 크롤링 완료\n`);
    }

    // Supabase에 저장
    if (validEvents.length > 0) {
      console.log(`💾 Supabase에 저장 중...\n`);
      const savedCount = await supabase.saveEvents(validEvents, 'COEX');
      console.log(`\n✅ ${savedCount}개 행사 저장 완료!\n`);
    } else {
      console.log(`\n⚠️  저장할 유효한 데이터가 없습니다.\n`);
    }

    console.log(`\n✨ 완료! 프론트엔드에서 확인하세요: http://localhost:5173\n`);

  } catch (error) {
    console.error(`\n❌ 에러 발생:`, error);
  }
}

loadCoexData();
