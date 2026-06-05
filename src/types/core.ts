// 핵심 타입 정의

export const Region = {
  Seoul: "서울",
  Metropolitan: "수도권",
  Chungcheong: "충청도",
  Jeolla: "전라도",
  Gangwon: "강원도",
  Gyeongsang: "경상도",
  Jeju: "제주도"
} as const;

export type Region = typeof Region[keyof typeof Region];

export type Venue =
  // 서울
  | "코엑스" | "코엑스 마곡" | "aT센터" | "세텍"
  // 수도권
  | "킨텍스" | "수원컨벤션센터" | "수원메쎄" | "송도컨벤시아"
  // 충청도
  | "대전컨벤션센터" | "청주오스코"
  // 전라도
  | "김대중컨벤션센터" | "군산새만금컨벤션센터"
  // 경상도
  | "벡스코" | "엑스코" | "애드코" | "창원컨벤션센터" | "유에코" | "경주화백컨벤션센터" | "구미코"
  // 제주도
  | "제주국제컨벤션센터";

export const Category = {
  Exhibition: "전시",
  Conference: "회의",
  EventPerformance: "행사/공연"
} as const;

export type Category = typeof Category[keyof typeof Category];

export type Industry = string; // KOSIS 18개 품목 중 하나

export const StatusBadge = {
  ComingSoon: "COMING SOON",
  DDay: "D-Day",
  OnGoing: "ON-GOING",
  Registering: "REGISTERING",
  End: "END"
} as const;

export type StatusBadge = typeof StatusBadge[keyof typeof StatusBadge];

export interface EventRecord {
  id: string;
  title: string;
  poster: string; // 이미지 URL
  region: Region;
  venue: Venue;
  startDate: Date;
  endDate: Date;
  dayString: string; // 자동 생성
  category: Category[]; // 다중 카테고리 지원
  industry: Industry;
  targetLink: string;
  venueEventPageUrl?: string; // 전시장 행사 소개 페이지 URL (예: COEX 행사 페이지)
  websiteUrl?: string; // 공식 웹사이트 URL (행사 주최측 웹사이트)
  description?: string;
  eventPurpose?: string; // 행사목적 (킨텍스 전용)
  admissionFee?: string;
  exhibitItems?: string; // 전시품목 (전시되는 품목/내용)
  exhibit_items?: string[]; // KOSIS 18개 품목 배열 (필터/배지용)
  exhibitProducts?: string; // 전시제품 (전시되는 제품)
  organizer?: string;
  supervisor?: string; // 주관 (행사를 주관하는 기관/단체)
  manager?: string; // 담당자명
  contact?: string; // 연락처 전화번호
  operatingHours?: string;
  venueHall?: string;
  isSaved: boolean; // 사용자별 상태
  view_count?: number; // 조회수 (관리자 전용)
}

export interface FilterCriteria {
  region?: Region | "전체";
  venue?: Venue | "전체";
  month?: string | "전체"; // "2026-01" 형식
  category?: Category | "전체";
  industries?: Industry[]; // 다중 선택
  exhibitItems?: string[]; // 전시품목 필터 (다중 선택)
}

// 전시품목 19개 카테고리 (하드코딩)
export const EXHIBIT_ITEMS = [
  "전체",
  "농수축산/식음료",
  "에너지/환경",
  "섬유/의류/쥬얼리",
  "금속/기계/장비",
  "전기/전자/정보통신/방송",
  "보건/의료/광학/정밀",
  "건설/건축/인테리어",
  "운송장비/서비스",
  "가정용품/선물용품",
  "뷰티/화장품",
  "금융/부동산/전문서비스",
  "공공/국방",
  "교육",
  "임신/출산/육아",
  "웨딩",
  "문화/예술",
  "레저/관광/스포츠",
  "기타"
] as const;

// 지역-장소 매핑
export const REGION_VENUE_MAP: Record<Region, Venue[]> = {
  [Region.Seoul]: ["코엑스", "코엑스 마곡", "aT센터", "세텍"],
  [Region.Metropolitan]: ["킨텍스", "수원컨벤션센터", "수원메쎄", "송도컨벤시아"],
  [Region.Chungcheong]: ["대전컨벤션센터", "청주오스코"],
  [Region.Jeolla]: ["김대중컨벤션센터", "군산새만금컨벤션센터"],
  [Region.Gangwon]: [],
  [Region.Gyeongsang]: ["벡스코", "엑스코", "애드코", "창원컨벤션센터", "유에코", "경주화백컨벤션센터", "구미코"],
  [Region.Jeju]: ["제주국제컨벤션센터"]
};

export const ALL_VENUES: Venue[] = Object.values(REGION_VENUE_MAP).flat();
