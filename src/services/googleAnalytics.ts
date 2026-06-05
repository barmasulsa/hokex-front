// Google Analytics Data API 서비스
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import * as path from 'path';

// GA4 Property ID
const propertyId = '538348093';

// 서비스 계정 키 파일 경로
const keyFilePath = path.join(process.cwd(), 'hokex-498415-10f93dedf734.json');

// Analytics Data API 클라이언트 초기화
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: keyFilePath,
});

/**
 * 오늘 방문자 수 조회 (한국에서만)
 */
export async function getTodayVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'today',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('오늘 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 어제 방문자 수 조회 (한국에서만)
 */
export async function getYesterdayVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'yesterday',
          endDate: 'yesterday',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('어제 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 7일 방문자 수 조회 (한국에서만)
 */
export async function getLast7DaysVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 7일 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 15일 방문자 수 조회 (한국에서만)
 */
export async function getLast15DaysVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '14daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 15일 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 30일 방문자 수 조회 (한국에서만)
 */
export async function getLast30DaysVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 30일 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 3개월 방문자 수 조회 (한국에서만)
 */
export async function getLast3MonthsVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '90daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 3개월 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 6개월 방문자 수 조회 (한국에서만)
 */
export async function getLast6MonthsVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '180daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 6개월 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 1년 방문자 수 조회 (한국에서만)
 */
export async function getLast1YearVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '365daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 1년 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 전체 방문자 수 조회 (계정 생성 이후, 한국에서만)
 */
export async function getTotalVisitors(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '2020-01-01', // GA4 데이터 수집 시작일 (적절히 조정)
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'totalUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('전체 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 커스텀 기간 방문자 수 조회 (한국에서만)
 * @param startDate YYYY-MM-DD 형식
 * @param endDate YYYY-MM-DD 형식
 */
export async function getCustomRangeVisitors(
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('커스텀 기간 방문자 수 조회 실패:', error);
    return 0;
  }
}

// ========================================
// 해외 방문자 통계 (대한민국 외)
// ========================================

/**
 * 오늘 해외 방문자 수 조회
 */
export async function getTodayVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'today',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('오늘 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 어제 해외 방문자 수 조회
 */
export async function getYesterdayVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'yesterday',
          endDate: 'yesterday',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('어제 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 7일 해외 방문자 수 조회
 */
export async function getLast7DaysVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 7일 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 15일 해외 방문자 수 조회
 */
export async function getLast15DaysVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '14daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 15일 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 30일 해외 방문자 수 조회
 */
export async function getLast30DaysVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 30일 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 3개월 해외 방문자 수 조회
 */
export async function getLast3MonthsVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '90daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 3개월 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 6개월 해외 방문자 수 조회
 */
export async function getLast6MonthsVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '180daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 6개월 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 최근 1년 해외 방문자 수 조회
 */
export async function getLast1YearVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '365daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('최근 1년 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 전체 해외 방문자 수 조회
 */
export async function getTotalVisitorsInternational(): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '2020-01-01',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'totalUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('전체 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

/**
 * 커스텀 기간 해외 방문자 수 조회
 */
export async function getCustomRangeVisitorsInternational(
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
      ],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'country',
            stringFilter: {
              matchType: 'EXACT',
              value: 'South Korea',
            },
          },
        },
      },
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('커스텀 기간 해외 방문자 수 조회 실패:', error);
    return 0;
  }
}

// ========================================
// 시간대별/지역별 통계
// ========================================

/**
 * 시간대별 유입 통계 (오늘)
 */
export interface HourlyTraffic {
  hour: string; // "00", "01", ..., "23"
  visitors: number;
}

export async function getHourlyTraffic(): Promise<HourlyTraffic[]> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'today',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'hour',
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
      orderBys: [
        {
          dimension: {
            dimensionName: 'hour',
          },
        },
      ],
    });

    const hourlyData: HourlyTraffic[] = [];

    if (response.rows) {
      for (const row of response.rows) {
        const hour = row.dimensionValues?.[0]?.value || '00';
        const visitors = parseInt(row.metricValues?.[0]?.value || '0', 10);
        hourlyData.push({ hour, visitors });
      }
    }

    // 0~23시까지 모든 시간대를 채움 (데이터가 없는 시간은 0)
    const fullHourlyData: HourlyTraffic[] = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      const existing = hourlyData.find((h) => h.hour === hour);
      fullHourlyData.push({
        hour,
        visitors: existing ? existing.visitors : 0,
      });
    }

    return fullHourlyData;
  } catch (error) {
    console.error('시간대별 유입 통계 조회 실패:', error);
    return [];
  }
}

/**
 * 지역별 방문자 통계
 */
export interface RegionalTraffic {
  country: string;
  region: string;
  city: string;
  visitors: number;
}

export async function getRegionalTraffic(): Promise<RegionalTraffic[]> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'country',
        },
        {
          name: 'region',
        },
        {
          name: 'city',
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'activeUsers',
          },
          desc: true,
        },
      ],
      limit: 100, // 상위 100개 지역
    });

    const regionalData: RegionalTraffic[] = [];

    if (response.rows) {
      for (const row of response.rows) {
        const country = row.dimensionValues?.[0]?.value || 'Unknown';
        const region = row.dimensionValues?.[1]?.value || 'Unknown';
        const city = row.dimensionValues?.[2]?.value || 'Unknown';
        const visitors = parseInt(row.metricValues?.[0]?.value || '0', 10);

        regionalData.push({
          country,
          region,
          city,
          visitors,
        });
      }
    }

    return regionalData;
  } catch (error) {
    console.error('지역별 방문자 통계 조회 실패:', error);
    return [];
  }
}

/**
 * 종합 통계 한 번에 가져오기 (효율적)
 */
export interface ComprehensiveStats {
  today: number;
  yesterday: number;
  last7Days: number;
  last15Days: number;
  last30Days: number;
  last3Months: number;
  last6Months: number;
  last1Year: number;
  total: number;
  hourlyTraffic: HourlyTraffic[];
  regionalTraffic: RegionalTraffic[];
}

export async function getComprehensiveStats(): Promise<ComprehensiveStats> {
  try {
    // 병렬로 모든 데이터 조회
    const [
      today,
      yesterday,
      last7Days,
      last15Days,
      last30Days,
      last3Months,
      last6Months,
      last1Year,
      total,
      hourlyTraffic,
      regionalTraffic,
    ] = await Promise.all([
      getTodayVisitors(),
      getYesterdayVisitors(),
      getLast7DaysVisitors(),
      getLast15DaysVisitors(),
      getLast30DaysVisitors(),
      getLast3MonthsVisitors(),
      getLast6MonthsVisitors(),
      getLast1YearVisitors(),
      getTotalVisitors(),
      getHourlyTraffic(),
      getRegionalTraffic(),
    ]);

    return {
      today,
      yesterday,
      last7Days,
      last15Days,
      last30Days,
      last3Months,
      last6Months,
      last1Year,
      total,
      hourlyTraffic,
      regionalTraffic,
    };
  } catch (error) {
    console.error('종합 통계 조회 실패:', error);
    throw error;
  }
}
