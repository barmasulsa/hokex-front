/**
 * 모든 전시장 데이터 로드 스크립트
 * sample-data 폴더의 모든 엑셀 파일을 파싱하여 Supabase에 저장
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExcelParser } from '../core/excel-parser';
import { DataNormalizer } from '../core/normalizer';
import { DataValidator } from '../core/validator';
import { SupabaseService } from '../services/supabase';
import { PosterScraper } from '../services/poster-scraper';
import { NormalizedEventData } from '../types/event';
import { VENUE_CONFIGS, getVenueConfig } from '../config/venues';

const excelParser = new ExcelParser();
const normalizer = new DataNormalizer();
const validator = new DataValidator();
const supabase = new SupabaseService();
const posterScraper = new PosterScraper();

async function loadVenueData(venueCode: string): Promise<number> {
  try {
    const config = getVenueConfig(venueCode);
    if (!config) {
      console.error(`❌ 전시장 설정을 찾을 수 없습니다: ${venueCode}`);
      return 0;
    }

    console.log(`\n📍 ${config.name} (${venueCode}) 데이터 로드 시작...\n`);

    // 파일 경로 찾기
    const sampleDataDir = path.join(__dirname, '../../sample-data');
    const possibleFiles = [
      path.join(sampleDataDir, `${venueCode}_schedule.xlsx`),
      path.join(sampleDataDir, `${venueCode}_schedule.xls`),
      path.join(sampleDataDir, `${venueCode}_schedule.csv`),
      // Downloads 폴더도 확인
      `C:/Users/lcw55/Downloads/${venueCode}_schedule.xlsx`,
      `C:/Users/lcw55/Downloads/${venueCode}_schedule.xls`,
    ];

    let filePath: string | null = null;
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        filePath = file;
        break;
      }
    }

    if (!filePath) {
      console.log(`⚠️  파일을 찾을 수 없습니다. 다음 위치 중 하나에 저장해주세요:`);
      possibleFiles.forEach(f => console.log(`   - ${f}`));
      return 0;
    }

    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 파일 로드 완료: ${path.basename(filePath)}\n`);

    // Excel 파싱
    const parseOptions = {
      columnMapping: config.columnMapping,
      fileFormat: config.fileFormat
    };

    console.log(`🔍 Excel 파싱 중...`);
    const rawEvents = excelParser.parseExcelFile(fileBuffer, parseOptions);
    console.log(`✅ ${rawEvents.length}개 행사 데이터 추출 완료\n`);

    if (rawEvents.length === 0) {
      console.log(`⚠️  추출된 데이터가 없습니다.\n`);
      return 0;
    }

    // 데이터 정규화 및 검증
    console.log(`🔄 데이터 정규화 및 검증 중...\n`);
    const validEvents: NormalizedEventData[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawEvent of rawEvents) {
      try {
        // 정규화
        const normalized = normalizer.normalize(rawEvent, venueCode);
        
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

    // 포스터 이미지 크롤링 (모든 행사)
    if (validEvents.length > 0) {
      console.log(`🖼️  포스터 이미지 크롤링 중 (${validEvents.length}개)...\n`);
      
      let posterFoundCount = 0;
      let posterNotFoundCount = 0;
      
      for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        
        if (event.targetLink) {
          console.log(`${i + 1}/${validEvents.length} ${event.title}`);
          const result = await posterScraper.scrapePostUrl(
            event.targetLink,
            event.title,
            venueCode
          );
          
          if (result.posterUrl) {
            event.posterUrl = result.posterUrl;
            posterFoundCount++;
            console.log(`   ✅ 포스터 발견`);
          } else {
            posterNotFoundCount++;
            console.log(`   ⚠️  포스터 없음`);
          }
          
          // 상세 정보 저장 (COEX인 경우)
          if (result.description) event.description = result.description;
          if (result.admissionFee) event.admissionFee = result.admissionFee;
          if (result.exhibitItems) event.exhibitItems = result.exhibitItems;
          if (result.exhibitProducts) event.exhibitProducts = result.exhibitProducts;
          if (result.organizer) event.organizer = result.organizer;
          if (result.contact) event.contact = result.contact;
          if (result.operatingHours) event.operatingHours = result.operatingHours;
          if (result.venueHall) event.venueHall = result.venueHall;
          
          // 서버 부하 방지를 위한 딜레이 (1초)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // targetLink가 없어도 COEX 행사면 COEX 페이지 시도
          if (venueCode === 'COEX') {
            console.log(`${i + 1}/${validEvents.length} ${event.title} - COEX 페이지 시도`);
            const result = await posterScraper.scrapeCoexEventPage(event.title);
            
            if (result.posterUrl) {
              event.posterUrl = result.posterUrl;
              posterFoundCount++;
              console.log(`   ✅ 포스터 발견 (COEX 페이지)`);
            } else {
              posterNotFoundCount++;
              console.log(`   ⚠️  포스터 없음`);
            }
            
            // 상세 정보 저장
            if (result.description) event.description = result.description;
            if (result.admissionFee) event.admissionFee = result.admissionFee;
            if (result.exhibitItems) event.exhibitItems = result.exhibitItems;
            if (result.exhibitProducts) event.exhibitProducts = result.exhibitProducts;
            if (result.organizer) event.organizer = result.organizer;
            if (result.contact) event.contact = result.contact;
            if (result.operatingHours) event.operatingHours = result.operatingHours;
            if (result.venueHall) event.venueHall = result.venueHall;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            posterNotFoundCount++;
            console.log(`${i + 1}/${validEvents.length} ${event.title} - 관련 사이트 없음`);
          }
        }
      }
      
      console.log(`\n✅ 포스터 크롤링 완료`);
      console.log(`   발견: ${posterFoundCount}개`);
      console.log(`   미발견: ${posterNotFoundCount}개\n`);
    }

    // Supabase에 저장
    if (validEvents.length > 0) {
      console.log(`💾 Supabase에 저장 중...\n`);
      const savedCount = await supabase.saveEvents(validEvents, venueCode);
      console.log(`\n✅ ${savedCount}개 행사 저장 완료!\n`);
      return savedCount;
    }

    return 0;

  } catch (error) {
    console.error(`\n❌ ${venueCode} 처리 중 에러 발생:`, error);
    return 0;
  }
}

async function loadAllVenues() {
  console.log(`\n🚀 전체 전시장 데이터 로드 시작...\n`);
  console.log(`📋 총 ${VENUE_CONFIGS.length}개 전시장\n`);

  let totalSaved = 0;
  let processedCount = 0;

  for (const config of VENUE_CONFIGS) {
    const saved = await loadVenueData(config.code);
    totalSaved += saved;
    if (saved > 0) {
      processedCount++;
    }
    
    // 다음 전시장 처리 전 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✨ 전체 완료!\n`);
  console.log(`📊 요약:`);
  console.log(`   처리된 전시장: ${processedCount}개`);
  console.log(`   저장된 행사: ${totalSaved}개\n`);
  console.log(`🌐 프론트엔드에서 확인: http://localhost:5173\n`);
}

// 커맨드 라인 인자 확인
const venueCode = process.argv[2];

if (venueCode) {
  // 특정 전시장만 처리
  loadVenueData(venueCode);
} else {
  // 모든 전시장 처리
  loadAllVenues();
}
