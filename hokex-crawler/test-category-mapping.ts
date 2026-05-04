/**
 * Category 매핑 테스트
 */

import { DataNormalizer } from './src/core/normalizer';

const normalizer = new DataNormalizer();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Category 매핑 테스트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 테스트 케이스 1: 웨딩박람회 (Excel: 회의 → 전시로 수정)
console.log('1️⃣  웨딩박람회 (Excel: 회의):');
const wedding = normalizer.normalize({
  title: '제415회 웨덱스 웨딩박람회',
  startDate: '2026-04-25',
  endDate: '2026-04-26',
  category: '회의', // Excel 원본 (잘못된 값)
  industry: '문화/예술',
  targetLink: 'https://www.weddex.com',
  organizer: '웨덱스'
}, 'COEX');

console.log(`제목: ${wedding.title}`);
console.log(`Category (Excel): 회의`);
console.log(`Category (Normalized): ${wedding.category}`);
console.log(`Industry (Excel): 문화/예술`);
console.log(`Industry (Normalized): ${wedding.industry}`);
console.log(`✅ 예상: category=전시, industry=웨딩\n`);

// 테스트 케이스 2: 유학박람회 (Excel: 회의 → 전시로 수정)
console.log('2️⃣  유학박람회 (Excel: 회의):');
const study = normalizer.normalize({
  title: '2026 유학박람회',
  startDate: '2026-03-15',
  endDate: '2026-03-16',
  category: '회의', // Excel 원본 (잘못된 값)
  industry: '문화/예술',
  targetLink: 'https://example.com',
  organizer: '유학네트'
}, 'COEX');

console.log(`제목: ${study.title}`);
console.log(`Category (Excel): 회의`);
console.log(`Category (Normalized): ${study.category}`);
console.log(`Industry (Excel): 문화/예술`);
console.log(`Industry (Normalized): ${study.industry}`);
console.log(`✅ 예상: category=전시, industry=교육\n`);

// 테스트 케이스 3: 컨퍼런스 (회의로 유지)
console.log('3️⃣  컨퍼런스 (회의 유지):');
const conference = normalizer.normalize({
  title: '제20회 국제 시큐리티 콘퍼런스',
  startDate: '2026-05-20',
  endDate: '2026-05-21',
  category: '회의',
  industry: 'IT',
  targetLink: 'https://example.com',
  organizer: '보안협회'
}, 'COEX');

console.log(`제목: ${conference.title}`);
console.log(`Category (Excel): 회의`);
console.log(`Category (Normalized): ${conference.category}`);
console.log(`✅ 예상: category=회의 (정확함)\n`);

// 테스트 케이스 4: 페어 (전시)
console.log('4️⃣  페어 (전시):');
const fair = normalizer.normalize({
  title: '제50회 베페 베이비페어',
  startDate: '2026-09-10',
  endDate: '2026-09-13',
  category: '회의', // Excel 원본 (잘못된 값)
  industry: '기타',
  targetLink: 'https://example.com',
  organizer: '베페'
}, 'COEX');

console.log(`제목: ${fair.title}`);
console.log(`Category (Excel): 회의`);
console.log(`Category (Normalized): ${fair.category}`);
console.log(`Industry (Excel): 기타`);
console.log(`Industry (Normalized): ${fair.industry}`);
console.log(`✅ 예상: category=전시, industry=임신/출산/육아\n`);

// 테스트 케이스 5: 엑스포 (전시)
console.log('5️⃣  엑스포 (전시):');
const expo = normalizer.normalize({
  title: 'AI서밋서울앤엑스포',
  startDate: '2026-06-10',
  endDate: '2026-06-12',
  category: '회의', // Excel 원본 (잘못된 값)
  industry: 'IT',
  targetLink: 'https://example.com',
  organizer: 'AI협회'
}, 'COEX');

console.log(`제목: ${expo.title}`);
console.log(`Category (Excel): 회의`);
console.log(`Category (Normalized): ${expo.category}`);
console.log(`✅ 예상: category=전시\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
