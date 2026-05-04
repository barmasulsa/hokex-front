/**
 * 1월~4월 행사 설명 업데이트
 * 실제 크롤링된 설명만 사용, 없으면 null로 설정
 */

import { SupabaseService } from './src/services/supabase';
import { PosterScraper } from './src/services/poster-scraper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const posterScraper = new PosterScraper();

async function updateAllDescriptions() {
  console.log('=== 1월~4월 행사 설명 업데이트 시작 ===\n');

  // 1월~4월 행사 조회
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .or(
      'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
      'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
      'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
    )
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${events?.length || 0}개의 행사 발견\n`);

  if (!events || events.length === 0) {
    console.log('업데이트할 행사가 없습니다.');
    return;
  }

  let updatedCount = 0;
  let noDescriptionCount = 0;
  let errorCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n${i + 1}/${events.length} ${event.title}`);

    try {
      // COEX 페이지에서 크롤링
      const result = await posterScraper.scrapePostUrl(
        event.target_link || '',
        event.title,
        'COEX'
      );

      // 실제 크롤링된 설명이 있으면 업데이트
      if (result.description && result.description.trim()) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            description: result.description,
            admission_fee: result.admissionFee || event.admission_fee,
            exhibit_items: result.exhibitItems || event.exhibit_items,
            exhibit_products: result.exhibitProducts || event.exhibit_products,
            organizer: result.organizer || event.organizer,
            supervisor: result.supervisor || event.supervisor,
            contact: result.contact || event.contact,
            operating_hours: result.operatingHours || event.operating_hours,
            venue_hall: result.venueHall || event.venue_hall,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (updateError) {
          console.log(`   ❌ 업데이트 실패: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ 설명 업데이트: ${result.description.substring(0, 50)}...`);
          updatedCount++;
        }
      } else {
        // 설명이 없으면 기존 설명 삭제 (null로 설정)
        const { error: updateError } = await supabase
          .from('events')
          .update({
            description: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (updateError) {
          console.log(`   ❌ 업데이트 실패: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ⚠️  설명 없음 (null로 설정)`);
          noDescriptionCount++;
        }
      }

      // 요청 간격 (1초)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ❌ 에러: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n=== 업데이트 완료 ===');
  console.log(`✅ 설명 업데이트: ${updatedCount}개`);
  console.log(`⚠️  설명 없음: ${noDescriptionCount}개`);
  console.log(`❌ 에러: ${errorCount}개`);
  console.log(`📊 전체: ${events.length}개`);
}

updateAllDescriptions();
