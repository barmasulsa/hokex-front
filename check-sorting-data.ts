import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env 파일 읽기
const envFile = readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in .env file');
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('Key:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSortingData() {
  console.log('5월 27일 행사 데이터 확인 중...\n');
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title, venue, region, start_date, end_date')
    .gte('start_date', '2026-05-27')
    .lte('start_date', '2026-05-27')
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${data.length}개 행사 발견\n`);
  
  data.forEach((event, i) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`${i + 1}. ${event.title}`);
    console.log(`   전시장: ${event.venue} (${event.region})`);
    console.log(`   기간: ${event.start_date} ~ ${event.end_date} (${duration}일)`);
    console.log(`   단일날짜: ${duration === 1 ? 'YES' : 'NO'}`);
    console.log('');
  });
}

checkSortingData();
