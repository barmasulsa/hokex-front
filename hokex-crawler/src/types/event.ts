/**
 * Event data types
 */

export type Region = '서울' | '수도권' | '충청도' | '전라도' | '강원도' | '경상도' | '제주도';

export type Venue =
  // 서울
  | '코엑스' | '코엑스 마곡' | 'aT센터' | '세텍'
  // 수도권
  | '킨텍스' | '수원컨벤션센터' | '송도컨벤시아' | '수원메쎄'
  // 충청도
  | '대전컨벤션센터' | '세종컨벤션센터' | '청주오스코'
  // 전라도
  | '김대중컨벤션센터' | '군산새만금컨벤션센터'
  // 강원도
  | '강릉아레나' | '원주컨벤션센터'
  // 경상도
  | '벡스코' | '엑스코' | '창원컨벤션센터' | '유에코' | '경주화백컨벤션센터' | '구미코'
  // 제주도
  | '제주국제컨벤션센터';

export type Category = '전시' | '회의' | '공연';

export type EventStatus = 'pending' | 'approved' | 'rejected';

/**
 * Raw event data from venue websites (before normalization)
 */
export interface RawEventData {
  title: string;
  posterUrl?: string;
  startDate: string;
  endDate: string;
  category?: string;
  industry?: string;
  organizer?: string;
  supervisor?: string;
  description?: string;
  admissionFee?: string;
  operatingHours?: string;
  contact?: string;
  address?: string;
  targetLink?: string;
}

/**
 * Normalized event data (HOKEX standard format)
 */
export interface NormalizedEventData {
  title: string;
  posterUrl: string | null;
  region: Region;
  venue: Venue;
  startDate: string; // ISO 8601: YYYY-MM-DD
  endDate: string;   // ISO 8601: YYYY-MM-DD
  dayString: string; // 예: "(수)"
  category: Category;
  industry: string;
  targetLink?: string;
  description?: string;
  organizer?: string;
  supervisor?: string;
  admissionFee?: string;
  exhibitItems?: string; // 전시품목 (전시되는 품목/내용)
  exhibitProducts?: string; // 전시제품 (전시되는 제품)
  operatingHours?: string;
  contact?: string;
  address?: string;
  venueHall?: string; // 예: "Hall C"
}

/**
 * Event record in database
 */
export interface EventRecord extends NormalizedEventData {
  id: string;
  status: EventStatus;
  crawlSource: string;
  lastCrawledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
