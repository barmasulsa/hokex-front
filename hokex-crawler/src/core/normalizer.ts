/**
 * Data Normalizer
 * Converts raw event data from various venue formats to HOKEX standard format
 * Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { RawEventData, NormalizedEventData, Category, Region, Venue } from '../types/event';
import { convertToISO8601, generateDayString } from '../utils/date';
import mappings from '../../config/mappings.json';

export class DataNormalizer {
  /**
   * Decode HTML entities in text
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' '
    };

    return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
      return entities[match] || match;
    });
  }

  /**
   * Normalize raw event data to HOKEX standard format
   */
  normalize(rawData: RawEventData, venueCode: string): NormalizedEventData {
    // Get venue name from venue code
    const venue = this.getVenueFromCode(venueCode);
    
    // Get region from venue
    const region = this.getRegionFromVenue(venue);

    // Normalize dates to ISO 8601
    const startDate = convertToISO8601(rawData.startDate);
    const endDate = convertToISO8601(rawData.endDate);

    // Generate day string
    const dayString = generateDayString(new Date(startDate));

    // Map category to standard
    const category = this.mapCategory(rawData.category, rawData.title);

    // Map industry to standard
    const industry = this.mapIndustry(rawData.industry, rawData.title);

    // Handle poster URL (null if not provided)
    const posterUrl = rawData.posterUrl || null;

    return {
      title: this.decodeHtmlEntities(rawData.title.trim()),
      posterUrl,
      region,
      venue,
      startDate,
      endDate,
      dayString,
      category,
      industry,
      targetLink: rawData.targetLink,
      description: rawData.description,
      organizer: rawData.organizer,
      supervisor: rawData.supervisor,
      admissionFee: rawData.admissionFee,
      operatingHours: rawData.operatingHours,
      contact: rawData.contact,
      address: rawData.address
    };
  }

  /**
   * Map venue-specific category to HOKEX standard category
   * Implements Requirement 2.1
   * 
   * Excel 데이터가 부정확할 수 있으므로 행사명 기반으로 우선 판단
   */
  private mapCategory(category?: string, title?: string): Category {
    // 1. 행사명 기반 우선 매핑 (Excel 데이터 오류 보정)
    if (title) {
      const titleLower = title.toLowerCase();
      
      // 우선순위 점수 시스템: 여러 키워드가 있을 때 가장 강한 키워드 선택
      let exhibitionScore = 0;
      let conferenceScore = 0;
      let performanceScore = 0;
      
      // 전시 키워드 점수 계산
      if (titleLower.includes('박람회')) exhibitionScore += 3;
      if (titleLower.includes('페어')) exhibitionScore += 3;
      if (titleLower.includes('엑스포') || titleLower.includes('expo')) exhibitionScore += 3;
      if (titleLower.includes('전시회')) exhibitionScore += 3;
      if (titleLower.includes('쇼')) exhibitionScore += 2;
      
      // 회의 키워드 점수 계산
      if (titleLower.includes('컨퍼런스') || titleLower.includes('conference')) conferenceScore += 3;
      if (titleLower.includes('포럼')) conferenceScore += 3;
      if (titleLower.includes('심포지엄')) conferenceScore += 3;
      if (titleLower.includes('학술대회')) conferenceScore += 2;
      if (titleLower.includes('세미나')) conferenceScore += 1; // 세미나는 낮은 점수 (부가 프로그램일 가능성)
      
      // 공연 키워드 점수 계산
      if (titleLower.includes('공연')) performanceScore += 3;
      if (titleLower.includes('페스티벌')) performanceScore += 3;
      if (titleLower.includes('콘서트')) performanceScore += 3;
      if (titleLower.includes('축제')) performanceScore += 2;
      
      // 가장 높은 점수의 카테고리 선택
      const maxScore = Math.max(exhibitionScore, conferenceScore, performanceScore);
      
      if (maxScore > 0) {
        if (exhibitionScore === maxScore) return '전시';
        if (conferenceScore === maxScore) return '회의';
        if (performanceScore === maxScore) return '공연';
      }
    }
    
    // 2. 기존 category 필드 기반 매핑
    if (!category) {
      return '전시'; // Default
    }

    const normalized = category.trim().toLowerCase();
    
    // Check mappings
    for (const [key, value] of Object.entries(mappings.categoryMappings)) {
      if (normalized.includes(key.toLowerCase())) {
        return value as Category;
      }
    }

    // Default to 전시
    return '전시';
  }

  /**
   * Map venue-specific industry to HOKEX standard industry
   * Implements Requirement 2.2
   */
  private mapIndustry(industry?: string, title?: string): string {
    // 1. 행사명 기반 우선 매핑 (COEX 데이터 오류 보정)
    if (title) {
      const titleLower = title.toLowerCase();
      
      // 웨딩 관련
      if (titleLower.includes('웨딩') || titleLower.includes('결혼')) {
        return '웨딩';
      }
      
      // 문화/예술 관련
      if (titleLower.includes('예술') || titleLower.includes('아트') || titleLower.includes('미술') || 
          titleLower.includes('일러스트') || titleLower.includes('디자인페스티벌')) {
        return '문화/예술';
      }
      
      // 베이비/육아 관련
      if (titleLower.includes('베이비') || titleLower.includes('유아') || titleLower.includes('육아') ||
          titleLower.includes('출산') || titleLower.includes('임신') || titleLower.includes('키즈')) {
        return '임신/출산/육아';
      }
      
      // 식품/음료 관련
      if (titleLower.includes('식품') || titleLower.includes('푸드') || titleLower.includes('카페') ||
          titleLower.includes('음료') || titleLower.includes('씨푸드')) {
        return '농수축산/식음료';
      }
      
      // 의료/보건 관련
      if (titleLower.includes('의료') || titleLower.includes('병원') || titleLower.includes('치과') ||
          titleLower.includes('보건') || titleLower.includes('제약') || titleLower.includes('바이오')) {
        return '보건/의료/광학/정밀';
      }
      
      // IT/전자 관련
      if (titleLower.includes('전자') || titleLower.includes('it') || titleLower.includes('소프트웨어') ||
          titleLower.includes('ai') || titleLower.includes('인공지능') || titleLower.includes('디스플레이')) {
        return '전기/전자/정보통신/방송';
      }
      
      // 건설/건축 관련
      if (titleLower.includes('건축') || titleLower.includes('건설') || titleLower.includes('인테리어') ||
          titleLower.includes('가구')) {
        return '건설/건축/인테리어';
      }
      
      // 교육 관련
      if (titleLower.includes('교육') || titleLower.includes('유학') || titleLower.includes('입학')) {
        return '교육';
      }
      
      // 관광/레저 관련
      if (titleLower.includes('관광') || titleLower.includes('여행') || titleLower.includes('트래블')) {
        return '레저/관광/스포츠';
      }
      
      // 프랜차이즈 관련
      if (titleLower.includes('프랜차이즈') || titleLower.includes('창업')) {
        return '금융/부동산/전문서비스';
      }
    }
    
    // 2. 기존 industry 필드 기반 매핑
    if (!industry) {
      return '기타'; // Default
    }

    const normalized = industry.trim();
    
    // Check mappings
    for (const [key, value] of Object.entries(mappings.industryMappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // Return as-is if no mapping found
    return normalized;
  }

  /**
   * Normalize venue name to standard format
   * Implements Requirement 2.4
   */
  normalizeVenueName(venueName: string): Venue {
    const normalized = venueName.trim();
    
    // Check mappings
    const mapped = mappings.venueNameMappings[normalized as keyof typeof mappings.venueNameMappings];
    if (mapped) {
      return mapped as Venue;
    }

    // Return as-is if no mapping found (will fail validation later)
    return normalized as Venue;
  }

  /**
   * Get venue from venue code
   */
  private getVenueFromCode(venueCode: string): Venue {
    // Map venue codes to venue names
    const venueCodeMap: Record<string, Venue> = {
      'COEX': '코엑스',
      'COEX_MAGOK': '코엑스 마곡',
      'AT_CENTER': 'aT센터',
      'SETEC': '세텍',
      'KINTEX': '킨텍스',
      'SUWON_CONV': '수원컨벤션센터',
      'SONGDO': '송도컨벤시아',
      'SUWON_MESSE': '수원메쎄',
      'DAEJEON_CONV': '대전컨벤션센터',
      'CHEONGJU_OSCO': '청주오스코',
      'KIMDAEJUNG_CONV': '김대중컨벤션센터',
      'GUNSAN_CONV': '군산새만금컨벤션센터',
      'GANGNEUNG_ARENA': '강릉아레나',
      'WONJU_CONV': '원주컨벤션센터',
      'BEXCO': '벡스코',
      'EXCO': '엑스코',
      'CHANGWON_CONV': '창원컨벤션센터',
      'UECO': '유에코',
      'GYEONGJU_CONV': '경주화백컨벤션센터',
      'GUMICO': '구미코',
      'ICC_JEJU': '제주국제컨벤션센터'
    };

    return venueCodeMap[venueCode] || '코엑스';
  }

  /**
   * Get region from venue name
   * Implements Requirement 2.5
   */
  private getRegionFromVenue(venue: Venue): Region {
    const region = mappings.venueToRegion[venue as keyof typeof mappings.venueToRegion];
    return (region as Region) || '서울';
  }
}
