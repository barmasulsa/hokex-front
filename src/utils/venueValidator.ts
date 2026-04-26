import type { Venue } from '../types/core';
import { Region, REGION_VENUE_MAP } from '../types/core';

export class VenueValidator {
  /**
   * 특정 지역에 속한 전시장 목록 반환
   * @param region - 지역 대분류
   * @returns 해당 지역의 전시장 목록
   */
  static getVenuesForRegion(region: Region): Venue[] {
    return REGION_VENUE_MAP[region];
  }

  /**
   * 전시장이 특정 지역에 속하는지 검증
   * @param venue - 전시장 소분류
   * @param region - 지역 대분류
   * @returns 유효 여부
   */
  static validateVenueForRegion(venue: Venue, region: Region): boolean {
    const validVenues = REGION_VENUE_MAP[region];
    return validVenues.includes(venue);
  }

  /**
   * 전시장이 속한 지역 찾기
   * @param venue - 전시장 소분류
   * @returns 해당 전시장이 속한 지역 또는 null
   */
  static findRegionForVenue(venue: Venue): Region | null {
    for (const [region, venues] of Object.entries(REGION_VENUE_MAP)) {
      if (venues.includes(venue)) {
        return region as Region;
      }
    }
    return null;
  }
}

/**
 * 편의 함수들
 */
export function getVenuesForRegion(region: Region): Venue[] {
  return VenueValidator.getVenuesForRegion(region);
}

export function validateVenueForRegion(venue: Venue, region: Region): boolean {
  return VenueValidator.validateVenueForRegion(venue, region);
}

export function findRegionForVenue(venue: Venue): Region | null {
  return VenueValidator.findRegionForVenue(venue);
}
