import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyFilters, filterPastEvents, sortByStartDate } from '../filterEngine';
import type { EventRecord } from '../../types/core';
import { Region, Category, ALL_VENUES } from '../../types/core';

// 테스트용 임의 EventRecord 생성기
function arbitraryEvent(): fc.Arbitrary<EventRecord> {
  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    poster: fc.webUrl(),
    region: fc.constantFrom(...Object.values(Region)),
    venue: fc.constantFrom(...ALL_VENUES),
    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    dayString: fc.constantFrom('(월)', '(화)', '(수)', '(목)', '(금)', '(토)', '(일)'),
    category: fc.array(fc.constantFrom(...Object.values(Category)), { minLength: 1, maxLength: 3 }),
    industry: fc.string({ minLength: 1, maxLength: 50 }),
    targetLink: fc.webUrl(),
    isSaved: fc.boolean(),
  }).chain(event => {
    // 제약 조건: endDate >= startDate
    const endDate = event.endDate < event.startDate ? event.startDate : event.endDate;
    return fc.constant({ ...event, endDate });
  });
}

// Feature: hokex-antigravity-platform, Property 10: 과거 행사 자동 필터링
describe('Property 10: Past Event Auto-filtering', () => {
  it('filtered events have endDate >= currentDate', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.date(),
        (events, currentDate) => {
          const filtered = filterPastEvents(events, currentDate);

          filtered.forEach(event => {
            expect(event.endDate.getTime()).toBeGreaterThanOrEqual(currentDate.getTime());
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 11: 행사 날짜 정렬 불변성
describe('Property 11: Event Date Sorting Invariant', () => {
  it('sorted events are in ascending order by startDate', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 2, maxLength: 50 }),
        (events) => {
          const sorted = sortByStartDate(events);

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].startDate.getTime()).toBeLessThanOrEqual(
              sorted[i + 1].startDate.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 20: 지역 필터 적용
describe('Property 20: Region Filter Application', () => {
  it('filtered events match selected region', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.constantFrom(...Object.values(Region)),
        (events, region) => {
          const filtered = applyFilters(events, { region });

          filtered.forEach(event => {
            expect(event.region).toBe(region);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('"전체" shows all regions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        (events) => {
          const filtered = applyFilters(events, { region: '전체' });

          expect(filtered.length).toBe(events.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 21: 장소 필터 적용
describe('Property 21: Venue Filter Application', () => {
  it('filtered events match selected venue', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.constantFrom(...ALL_VENUES),
        (events, venue) => {
          const filtered = applyFilters(events, { venue });

          filtered.forEach(event => {
            expect(event.venue).toBe(venue);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 22: 월 필터 적용
describe('Property 22: Month Filter Application', () => {
  it('filtered events have startDate in selected month', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 12 }),
        (events, month) => {
          const monthStr = `2026-${month.toString().padStart(2, '0')}`;
          const filtered = applyFilters(events, { month: monthStr });

          filtered.forEach(event => {
            const eventMonth = event.startDate.toISOString().slice(0, 7);
            expect(eventMonth).toBe(monthStr);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 23: 카테고리 필터 적용
describe('Property 23: Category Filter Application', () => {
  it('filtered events match selected category', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.constantFrom(...Object.values(Category)),
        (events, category) => {
          const filtered = applyFilters(events, { category });

          filtered.forEach(event => {
            // 배열인 경우 포함 여부 확인
            if (Array.isArray(event.category)) {
              expect(event.category).toContain(category);
            } else {
              expect(event.category).toBe(category);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 24: 산업 다중 선택 필터 적용
describe('Property 24: Industry Multi-select Filter Application', () => {
  it('filtered events match any of selected industries (OR condition)', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (events, industries) => {
          const filtered = applyFilters(events, { industries });

          filtered.forEach(event => {
            expect(industries).toContain(event.industry);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hokex-antigravity-platform, Property 25: 복합 필터 AND 조건
describe('Property 25: Combined Filter AND Condition', () => {
  it('all active filters must be satisfied', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEvent(), { minLength: 0, maxLength: 50 }),
        fc.record({
          region: fc.option(fc.constantFrom(...Object.values(Region)), { nil: undefined }),
          category: fc.option(fc.constantFrom(...Object.values(Category)), { nil: undefined }),
          month: fc.option(fc.string(), { nil: undefined }),
        }),
        (events, filters) => {
          const filtered = applyFilters(events, filters);

          filtered.forEach(event => {
            if (filters.region) {
              expect(event.region).toBe(filters.region);
            }
            if (filters.category) {
              // 배열인 경우 포함 여부 확인
              if (Array.isArray(event.category)) {
                expect(event.category).toContain(filters.category);
              } else {
                expect(event.category).toBe(filters.category);
              }
            }
            if (filters.month) {
              const eventMonth = event.startDate.toISOString().slice(0, 7);
              expect(eventMonth).toBe(filters.month);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
