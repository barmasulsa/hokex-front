/**
 * 전시장 설정
 * 21개 전시장의 정보와 엑셀 파싱 설정
 */

export interface VenueConfig {
  code: string;
  name: string;
  region: string;
  excelUrl?: string;
  columnMapping: {
    title: string;
    startDate: string;
    endDate: string;
    category?: string;
    industry?: string;
    organizer?: string;
    admissionFee?: string;
    contact?: string;
    targetLink?: string;
    posterUrl?: string;
  };
  fileFormat: 'xlsx' | 'xls' | 'csv';
}

export const VENUE_CONFIGS: VenueConfig[] = [
  // 서울
  {
    code: 'COEX',
    name: '코엑스',
    region: '서울',
    excelUrl: 'https://www.coex.co.kr/event/full-schedules/',
    columnMapping: {
      title: '행사명',
      startDate: '행사 시작일자',
      endDate: '행사 종료일자',
      category: '행사구분',
      industry: '행사분야',
      organizer: '주최',
      admissionFee: '입장료',
      contact: '담당자/공연문의 정보',
      targetLink: '관련 사이트'
    },
    fileFormat: 'xls'
  },
  {
    code: 'COEX_MAGOK',
    name: '코엑스 마곡',
    region: '서울',
    columnMapping: {
      title: '행사명',
      startDate: '행사 시작일자',
      endDate: '행사 종료일자',
      category: '행사구분',
      industry: '행사분야',
      organizer: '주최',
      admissionFee: '입장료',
      contact: '담당자/공연문의 정보',
      targetLink: '관련 사이트'
    },
    fileFormat: 'xls'
  },
  {
    code: 'AT_CENTER',
    name: 'aT센터',
    region: '서울',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'SETEC',
    name: '세텍',
    region: '서울',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 수도권
  {
    code: 'KINTEX',
    name: '킨텍스',
    region: '수도권',
    excelUrl: 'https://www.kintex.com',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'SUWON_CONV',
    name: '수원컨벤션센터',
    region: '수도권',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'SONGDO',
    name: '송도컨벤시아',
    region: '수도권',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'SUWON_MESSE',
    name: '수원메쎄',
    region: '수도권',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 충청도
  {
    code: 'DAEJEON_CONV',
    name: '대전컨벤션센터',
    region: '충청도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'CHEONGJU_OSCO',
    name: '청주오스코',
    region: '충청도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 전라도
  {
    code: 'KIMDAEJUNG_CONV',
    name: '김대중컨벤션센터',
    region: '전라도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'GUNSAN_CONV',
    name: '군산새만금컨벤션센터',
    region: '전라도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 강원도
  {
    code: 'GANGNEUNG_ARENA',
    name: '강릉아레나',
    region: '강원도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'WONJU_CONV',
    name: '원주컨벤션센터',
    region: '강원도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 경상도
  {
    code: 'BEXCO',
    name: '벡스코',
    region: '경상도',
    excelUrl: 'https://www.bexco.co.kr',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'EXCO',
    name: '엑스코',
    region: '경상도',
    excelUrl: 'https://www.exco.co.kr',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'CHANGWON_CONV',
    name: '창원컨벤션센터',
    region: '경상도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'UECO',
    name: '유에코',
    region: '경상도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'GYEONGJU_CONV',
    name: '경주화백컨벤션센터',
    region: '경상도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  {
    code: 'GUMICO',
    name: '구미코',
    region: '경상도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  },
  
  // 제주도
  {
    code: 'ICC_JEJU',
    name: '제주국제컨벤션센터',
    region: '제주도',
    columnMapping: {
      title: '행사명',
      startDate: '시작일',
      endDate: '종료일',
      category: '구분',
      industry: '산업',
      organizer: '주최'
    },
    fileFormat: 'xlsx'
  }
];

/**
 * 전시장 코드로 설정 찾기
 */
export function getVenueConfig(code: string): VenueConfig | undefined {
  return VENUE_CONFIGS.find(v => v.code === code);
}

/**
 * 전시장 이름으로 설정 찾기
 */
export function getVenueConfigByName(name: string): VenueConfig | undefined {
  return VENUE_CONFIGS.find(v => v.name === name);
}
