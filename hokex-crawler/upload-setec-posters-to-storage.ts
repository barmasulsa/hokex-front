/**
 * SETEC 포스터 이미지를 Supabase Storage에 업로드
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEMP_DIR = path.join(__dirname, 'temp_posters');

async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.setec.or.kr/'
      },
      timeout: 10000
    });

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const filepath = path.join(TEMP_DIR, filename);
    fs.writeFileSync(filepath, response.data);
    
    return filepath;
  } catch (error) {
    console.error(`❌ 이미지 다운로드 실패: ${url}`, error);
    return null;
  }
}

async function uploadToStorage(filepath: string, storagePath: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filepath);
    const contentType = 'image/jpeg';

    const { data, error } = await supabase.storage
      .from('event-posters')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('❌ Storage 업로드 실패:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('event-posters')
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Storage 업로드 에러:', error);
    return null;
  }
}

async function updateSetecPosters() {
  console.log('🔍 SETEC 포스터 업로드 시작...\n');

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, poster_url')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ 행사 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 행사 포스터 업로드 시작\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // 이미 Supabase Storage URL이면 스킵
        if (event.poster_url.includes('supabase')) {
          console.log(`⏭️  이미 업로드됨: ${event.title}`);
          skipCount++;
          continue;
        }

        // placeholder 이미지면 스킵
        if (event.poster_url.includes('placeholder')) {
          console.log(`⏭️  Placeholder: ${event.title}`);
          skipCount++;
          continue;
        }

        console.log(`🔍 ${event.title}`);
        console.log(`   원본 URL: ${event.poster_url}`);

        // 이미지 다운로드
        const filename = `setec_${event.id}.jpg`;
        const filepath = await downloadImage(event.poster_url, filename);

        if (!filepath) {
          console.log(`   ❌ 다운로드 실패\n`);
          errorCount++;
          continue;
        }

        // Storage에 업로드
        const storagePath = `setec/${filename}`;
        const publicUrl = await uploadToStorage(filepath, storagePath);

        if (!publicUrl) {
          console.log(`   ❌ 업로드 실패\n`);
          errorCount++;
          // 임시 파일 삭제
          fs.unlinkSync(filepath);
          continue;
        }

        // 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('events')
          .update({ poster_url: publicUrl })
          .eq('id', event.id);

        if (updateError) {
          console.error(`   ❌ DB 업데이트 실패:`, updateError.message);
          errorCount++;
        } else {
          console.log(`   ✅ 업로드 완료: ${publicUrl}\n`);
          successCount++;
        }

        // 임시 파일 삭제
        fs.unlinkSync(filepath);

        // 서버 부하 방지
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`   ❌ 에러:`, error.message);
        errorCount++;
      }
    }

    // 임시 디렉토리 삭제
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmdirSync(TEMP_DIR, { recursive: true });
    }

    console.log(`\n📊 업로드 완료:`);
    console.log(`   ✅ 성공: ${successCount}개`);
    console.log(`   ⏭️  스킵: ${skipCount}개`);
    console.log(`   ❌ 실패: ${errorCount}개\n`);

  } catch (error) {
    console.error('❌ 업로드 실패:', error);
  }
}

updateSetecPosters();
