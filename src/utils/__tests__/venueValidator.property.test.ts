import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateVenueForRegion, getVenuesForRegion, findRegionForVenue } from '../venueValidator';
import { Region, REGION_VENUE_MAP, ALL_VENUES } from '../../types/core';

// Feature: hokex-antigravity-platform, Property 4: 계층형 지역-장소 무결성
describe('Property 4: Hierarchical Region-Venue Integrity', () => {
  it('venue must belong to selected region', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(Region)),
        fc.constantFrom(...ALL_VENUES),
        (region, venue) => {
          const validVenues = REGION_VENUE_MAP[region];
          const isValid = validateVenueForRegion(venue, region);

          if (validVenues.includes(venue)) {
            // 유효한 조합이면 검증 통과
            expect(isValid).toBe(true);
          } else {
            // 무효한 조합이면 검증 실패
            expect(isValid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getVenuesForRegion returns only venues in that region', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(Region)),
        (region) => {
          const venues = getVenuesForRegion(region);
          const expectedVenues = REGION_VENUE_MAP[region];

          expect(venues).toEqual(expectedVenues);
          expect(venues.length).toBeGreaterThan(0);

          // 모든 반환된 전시장이 해당 지역에 속하는지 확인
          venues.forEach(venue => {
            expect(validateVenueForRegion(venue, region)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('findRegionForVenue returns correct region', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_VENUES),
        (venue) => {
          const foundRegion = findRegionForVenue(venue);

          expect(foundRegion).not.toBeNull();

          if (foundRegion) {
            // 찾은 지역에 해당 전시장이 포함되어 있는지 확인
            const venuesInRegion = REGION_VENUE_MAP[foundRegion];
            expect(venuesInRegion).toContain(venue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every venue belongs to exactly one region', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_VENUES),
        (venue) => {
          const regions = Object.values(Region).filter(region =>
            validateVenueForRegion(venue, region)
          );

          // 각 전시장은 정확히 하나의 지역에만 속해야 함
          expect(regions.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
