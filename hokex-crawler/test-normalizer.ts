/**
 * Normalizer 로직 테스트
 */

import { DataNormalizer } from './src/core/normalizer';

const normalizer = new DataNormalizer();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Normalizer 로직 테스트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 테스트 케이스 1: 웨딩 행사
console.log('1️⃣  웨딩 행사 테스트:');
const weddingEvent1 = normalizer.normalize({
  title: '제415회 웨덱스 웨딩박람회',
  startDate: '2026-04-25',
  endDate: '2026-04-26',
  category: '박람회',
  industry: '문화/예술', // Excel 원본 데이터 (잘못된 값)
  targetLink: 'https://www.weddex.com',
  organizer: '웨덱스'
}, 'COEX');

console.log(`제목: ${weddingEvent1.title}`);
console.log(`Industry (Excel): 문화/예술`);
console.log(`Industry (Normalized): ${weddingEvent1.industry}`);
console.log(`✅ 예상: 웨딩\n`);

// 테스트 케이스 2: 유학 박람회
console.log('2️⃣  유학 박람회 테스트:');
const studyEvent = normalizer.normalize({
  title: '2026 유학박람회',
  startDate: '2026-03-15',
  endDate: '2026-03-16',
  category: '박람회',
  industry: '문화/예술', // Excel 원본 데이터 (잘못된 값)
  targetLink: 'https://example.com',
  organizer: '유학네트'
}, 'COEX');

console.log(`제목: ${studyEvent.title}`);
console.log(`Industry (Excel): 문화/예술`);
console.log(`Industry (Normalized): ${studyEvent.industry}`);
console.log(`✅ 예상: 교육\n`);

// 테스트 케이스 3: 베이비페어
console.log('3️⃣  베이비페어 테스트:');
const babyEvent = normalizer.normalize({
  title: '제50회 베페 베이비페어',
  startDate: '2026-09-10',
  endDate: '2026-09-13',
  category: '박람회',
  industry: '기타', // Excel 원본 데이터 (잘못된 값)
  targetLink: 'https://example.com',
  organizer: '베페'
}, 'COEX');

console.log(`제목: ${babyEvent.title}`);
console.log(`Industry (Excel): 기타`);
console.log(`Industry (Normalized): ${babyEvent.industry}`);
console.log(`✅ 예상: 임신/출산/육아\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
