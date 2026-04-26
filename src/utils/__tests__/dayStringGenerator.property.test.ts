import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateDayString } from '../dayStringGenerator';

// Feature: hokex-antigravity-platform, Property 6: 요일 문자열 자동 생성
describe('Property 6: Day String Auto-generation', () => {
  it('generated day string matches actual day of week', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (date) => {
          const dayString = generateDayString(date);
          const expectedDays = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
          const expectedDay = expectedDays[date.getDay()];
          expect(dayString).toBe(expectedDay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('day string format is always in parentheses', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (date) => {
          const dayString = generateDayString(date);
          expect(dayString).toMatch(/^\(.+\)$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('day string is one of the seven valid Korean days', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (date) => {
          const dayString = generateDayString(date);
          const validDays = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
          expect(validDays).toContain(dayString);
        }
      ),
      { numRuns: 100 }
    );
  });
});
