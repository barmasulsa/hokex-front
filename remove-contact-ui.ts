/**
 * EventDetailPage에서 문의 섹션 제거 스크립트
 * 개인정보 보호를 위해 UI에서만 제거, 데이터는 유지
 */

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src/pages/EventDetailPage.tsx');

console.log('📝 EventDetailPage에서 문의 섹션 제거 중...\n');

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf-8');

// 1. SHOW_CONTACT_INFO 관련 코드 제거
content = content.replace(
  /\/\/ 문의 정보 표시 여부.*?\nconst SHOW_CONTACT_INFO = .*?;\n\n/s,
  ''
);

// 2. 각 venue별 문의 섹션 제거 (조건부 렌더링 포함)
// 패턴: {event.contact && ( ... <h4>문의</h4> ... )}
const contactSectionPattern = /\{(?:event\.contact|event\.manager \|\| event\.contact|\(event\.manager \|\| event\.contact\)) &&[\s\S]*?<h4>문의<\/h4>[\s\S]*?\}\s*\)/g;

let matches = content.match(contactSectionPattern);
if (matches) {
  console.log(`✅ ${matches.length}개 문의 섹션 발견`);
  content = content.replace(contactSectionPattern, '');
}

// 3. 벡스코/수원메쎄/수원컨벤션센터의 항상 표시되는 문의 섹션 제거
// 패턴: <div className="detail-item"> ... <h4>문의</h4> ... </div>
const alwaysShowContactPattern = /<div className="detail-item">\s*<Phone size=\{24\} \/>\s*<div>\s*<h4>문의<\/h4>[\s\S]*?<\/div>\s*<\/div>/g;

matches = content.match(alwaysShowContactPattern);
if (matches) {
  console.log(`✅ ${matches.length}개 항상 표시 문의 섹션 발견`);
  content = content.replace(alwaysShowContactPattern, '');
}

// 4. Phone import 제거 (사용하지 않음)
content = content.replace(
  /import \{ Calendar, MapPin, Clock, DollarSign, Phone, ExternalLink, Share2, Copy \} from 'lucide-react';/,
  "import { Calendar, MapPin, Clock, DollarSign, ExternalLink, Share2, Copy } from 'lucide-react';"
);

// 5. formatContact, formatCoexContact 함수는 유지 (향후 복구 가능)
// 주석만 추가
content = content.replace(
  /\/\/ Contact 필드 포맷팅/g,
  '// Contact 필드 포맷팅 (⚠️ 현재 UI에서 사용하지 않음 - 개인정보 보호)'
);

// 파일 쓰기
fs.writeFileSync(filePath, content, 'utf-8');

console.log('\n✅ 문의 섹션 제거 완료');
console.log('📄 파일:', filePath);
console.log('\n💡 참고:');
console.log('   - DB 데이터는 그대로 유지됨');
console.log('   - formatContact 함수는 코드에 남아있음 (향후 복구 가능)');
console.log('   - 스펙 문서는 별도로 업데이트 필요');
