import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateStatusBadge } from '../badgeCalculator';
import { StatusBadge } from '../../types/core';

// Feature: hokex-antigravity-platform, Property 12: 상태 배지 계산 정확성
describe('Property 12: Status Badge Calculation Accuracy', () => {
  it('calculates correct status badge based on dates', () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.date(),
        fc.date(),
        (currentDate, startDate, endDate) => {
          // 전제 조건: startDate <= endDate
          fc.pre(startDate <= endDate);

          const event = { startDate, endDate };
          const badge = calculateStatusBadge(event, currentDate);

          const daysDiff = Math.floor(
            (startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff > 7) {
            expect(badge).toBe(StatusBadge.ComingSoon);
          } else if (daysDiff >= 0 && daysDiff <= 7) {
            expect(badge).toBe(StatusBadge.DDay);
          } else if (currentDate >= startDate && currentDate <= endDate) {
            expect(badge).toBe(StatusBadge.OnGoing);
          }
          // 그 외의 경우는 null 또는 REGISTERING (등록 로직 미구현)
        }
      ),
      { numRuns: 100 }
    );
  });

  it('COMING SOON when more than 7 days before start', () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.integer({ min: 8, max: 365 }),
        (startDate, daysBeforeStart) => {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() - daysBeforeStart);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);

          const badge = calculateStatusBadge({ startDate, endDate }, currentDate);
          expect(badge).toBe(StatusBadge.ComingSoon);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('D-Day when within 7 days before start', () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.integer({ min: 0, max: 7 }),
        (startDate, daysBeforeStart) => {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() - daysBeforeStart);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);

          const badge = calculateStatusBadge({ startDate, endDate }, currentDate);
          expect(badge).toBe(StatusBadge.DDay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ON-GOING when between start and end dates', () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (startDate, duration, daysSinceStart) => {
          fc.pre(daysSinceStart <= duration);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + duration);

          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + daysSinceStart);

          const badge = calculateStatusBadge({ startDate, endDate }, currentDate);
          expect(badge).toBe(StatusBadge.OnGoing);
        }
      ),
      { numRuns: 100 }
    );
  });
});
