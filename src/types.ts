export type Region = '서울' | '수도권' | '충청' | '동남' | '대경' | '호남' | '제주';
export type Category = '전시' | '회의' | '행사/공연';
export type StatusBadge = 'COMING SOON' | 'D-Day' | 'ON-GOING' | 'REGISTERING';

export interface EventRecord {
  id: string;
  title: string;
  poster: string;
  region: Region;
  venue: string;
  startDate: Date | string;
  endDate: Date | string;
  dayString?: string;
  category: Category;
  industry: string;
  targetLink: string;
  isSaved?: boolean;
}

export const REGIONS: Record<Region, string[]> = {
  '서울': ['전체', '코엑스', '코엑스 마곡', 'aT센터', '세텍'],
  '수도권': ['전체', '킨텍스', '수원컨벤션센터', '송도컨벤시아', '수원메쎄'],
  '충청': ['전체', '대전컨벤션센터', '청주오스코'],
  '동남': ['전체', '벡스코', '창원컨벤션센터', '유에코'],
  '대경': ['전체', '엑스코', '경주화백컨벤션센터', '구미코'],
  '호남': ['전체', '김대중컨벤션센터', '군산새만금컨벤션센터'],
  '제주': ['전체', '제주국제컨벤션센터']
};

export const CATEGORIES: ('전체' | Category)[] = ['전체', '전시', '회의', '행사/공연'];

export const INDUSTRIES = [
  '전체',
  '농업, 임업 및 어업',
  '광업',
  '제조업',
  '전기, 가스, 증기 및 공기 조절 공급업',
  '수도, 하수 및 폐기물 처리, 원료 재생업',
  '건설업',
  '도매 및 소매업',
  '운수 및 창고업',
  '숙박 및 음식점업',
  '정보통신업',
  '금융 및 보험업',
  '부동산업',
  '전문, 과학 및 기술 서비스업',
  '사업시설 관리, 사업 지원 및 임대 서비스업',
  '공공 행정, 국방 및 사회보장 행정',
  '교육 서비스업',
  '보건업 및 사회복지 서비스업',
  '예술, 스포츠 및 여가관련 서비스업',
  '협회 및 단체, 수리 및 기타 개인 서비스업'
];
