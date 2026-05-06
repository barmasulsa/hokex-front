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
  | "대전컨벤션센터" | "세종컨벤션센터" | "청주오스코"
  // 전라도
  | "김대중컨벤션센터" | "군산새만금컨벤션센터"
  // 경상도
  | "벡스코" | "엑스코" | "창원컨벤션센터" | "유에코" | "경주화백컨벤션센터" | "구미코"
  // 제주도
  | "제주국제컨벤션센터";

export const Category = {
  Exhibition: "전시",
  Conference: "회의",
  Popup: "팝업",
  Performance: "공연"
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
  category: Category;
  industry: Industry;
  targetLink: string;
  venueEventPageUrl?: string; // 전시장 행사 소개 페이지 URL (예: COEX 행사 페이지)
  description?: string;
  eventPurpose?: string; // 행사목적 (킨텍스 전용)
  admissionFee?: string;
  exhibitItems?: string; // 전시품목 (전시되는 품목/내용)
  exhibitProducts?: string; // 전시제품 (전시되는 제품)
  organizer?: string;
  supervisor?: string; // 주관 (행사를 주관하는 기관/단체)
  contact?: string;
  operatingHours?: string;
  venueHall?: string;
  isSaved: boolean; // 사용자별 상태
}

export interface FilterCriteria {
  region?: Region | "전체";
  venue?: Venue | "전체";
  month?: string | "전체"; // "2026-01" 형식
  category?: Category | "전체";
  industries?: Industry[]; // 다중 선택
}

// 지역-장소 매핑
export const REGION_VENUE_MAP: Record<Region, Venue[]> = {
  [Region.Seoul]: ["코엑스", "코엑스 마곡", "aT센터", "세텍"],
  [Region.Metropolitan]: ["킨텍스", "수원컨벤션센터", "수원메쎄", "송도컨벤시아"],
  [Region.Chungcheong]: ["대전컨벤션센터", "세종컨벤션센터", "청주오스코"],
  [Region.Jeolla]: ["김대중컨벤션센터", "군산새만금컨벤션센터"],
  [Region.Gangwon]: [],
  [Region.Gyeongsang]: ["벡스코", "엑스코", "창원컨벤션센터", "유에코", "경주화백컨벤션센터", "구미코"],
  [Region.Jeju]: ["제주국제컨벤션센터"]
};

export const ALL_VENUES: Venue[] = Object.values(REGION_VENUE_MAP).flat();
