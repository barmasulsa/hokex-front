/**
 * COEX Magok 자동 크롤링 스크립트
 * 엑셀 파일 파싱 → 데이터 처리 → Supabase 저장
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

async function autoCrawlMagok() {
  try {
    console.log(`\n🚀 COEX Magok 자동 크롤링 시작...\n`);
    console.log(`📅 ${new Date().toLocaleString('ko-KR')}\n`);

    // 1단계: 엑셀 파일 읽기
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  1단계: 엑셀 파일 읽기`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const filePath = 'Coex_Magok_Schedule_20260505010854.xls';
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 파일 읽기 완료: ${filePath}\n`);

    // 2단계: 엑셀 파일 파싱
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  2단계: 엑셀 파일 파싱`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
    console.log(`✅ ${rawEvents.length}개 행사 데이터 추출 완료\n`);

    // 3단계: 데이터 정규화 및 검증
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  3단계: 데이터 정규화 및 검증`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const validEvents: NormalizedEventData[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawEvent of rawEvents) {
      try {
        const normalized = normalizer.normalize(rawEvent, 'COEX_MAGOK');
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

    // 4단계: 포스터 이미지 크롤링
    if (validEvents.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  4단계: 포스터 이미지 크롤링`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        
        if (event.targetLink) {
          console.log(`${i + 1}/${validEvents.length} ${event.title}`);
          const result = await posterScraper.scrapePostUrl(event.targetLink, event.title, 'COEX_MAGOK');
          
          if (result.posterUrl) {
            event.posterUrl = result.posterUrl;
            console.log(`   ✅ 포스터: ${result.posterUrl.substring(0, 60)}...`);
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

    // 5단계: Supabase에 저장
    if (validEvents.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  5단계: Supabase에 저장`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const savedCount = await supabase.saveEvents(validEvents, 'COEX_MAGOK');
      
      console.log(`\n✅ ${savedCount}개 행사 저장 완료!\n`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  완료!`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`🌐 웹사이트에서 확인: https://hokex-front.vercel.app/`);
      console.log(`🌐 로컬에서 확인: http://localhost:5173\n`);
    } else {
      console.log(`\n⚠️  저장할 유효한 데이터가 없습니다.\n`);
    }

  } catch (error) {
    console.error(`\n❌ 크롤링 실패:`, error);
    process.exit(1);
  }
}

// 실행
autoCrawlMagok();
