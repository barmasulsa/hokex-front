# Google Analytics Data API 설정 완료

## ✅ 완료된 작업

### 1. 패키지 설치
- `@google-analytics/data` 패키지 설치 완료

### 2. 서비스 계정 키 파일 설정
- 파일 위치: `hokex-498415-10f93dedf734.json` (프로젝트 루트)
- `.gitignore`에 추가하여 보안 유지

### 3. Google Analytics 서비스 모듈 생성
- 파일: `src/services/googleAnalytics.ts`
- GA4 Property ID: `538348093`
- 서비스 계정: `hokexpanda@gmail.com`

## 📊 제공되는 기능

### 기본 통계 함수

1. **getTodayVisitors()** - 오늘 방문자 수
2. **getYesterdayVisitors()** - 어제 방문자 수
3. **getLast7DaysVisitors()** - 최근 7일 방문자 수
4. **getLast15DaysVisitors()** - 최근 15일 방문자 수
5. **getLast30DaysVisitors()** - 최근 30일 방문자 수
6. **getLast3MonthsVisitors()** - 최근 3개월 방문자 수
7. **getLast6MonthsVisitors()** - 최근 6개월 방문자 수
8. **getLast1YearVisitors()** - 최근 1년 방문자 수
9. **getTotalVisitors()** - 전체 방문자 수
10. **getCustomRangeVisitors(startDate, endDate)** - 커스텀 기간 방문자 수

### 상세 통계 함수

1. **getHourlyTraffic()** - 시간대별 유입 통계 (오늘, 0~23시)
   ```typescript
   [
     { hour: "00", visitors: 10 },
     { hour: "01", visitors: 5 },
     ...
   ]
   ```

2. **getRegionalTraffic()** - 지역별 방문자 통계 (최근 30일, 상위 100개)
   ```typescript
   [
     { 
       country: "South Korea", 
       region: "Seoul", 
       city: "Seoul", 
       visitors: 1500 
     },
     ...
   ]
   ```

3. **getComprehensiveStats()** - 모든 통계를 한 번에 가져오기 (병렬 처리로 빠름)
   ```typescript
   {
     today: 100,
     yesterday: 95,
     last7Days: 700,
     last15Days: 1400,
     last30Days: 2800,
     last3Months: 8000,
     last6Months: 15000,
     last1Year: 30000,
     total: 50000,
     hourlyTraffic: [...],
     regionalTraffic: [...]
   }
   ```

## 🔧 사용 예시

### API Route 또는 서버 컴포넌트에서 사용

```typescript
import { 
  getTodayVisitors, 
  getComprehensiveStats 
} from '@/services/googleAnalytics';

// 1. 오늘 방문자만 가져오기
const todayVisitors = await getTodayVisitors();
console.log(`오늘 방문자: ${todayVisitors}명`);

// 2. 모든 통계 한 번에 가져오기
const stats = await getComprehensiveStats();
console.log('종합 통계:', stats);

// 3. 커스텀 기간 조회
import { getCustomRangeVisitors } from '@/services/googleAnalytics';
const visitors = await getCustomRangeVisitors('2026-05-01', '2026-05-31');
console.log(`5월 방문자: ${visitors}명`);
```

## 📝 다음 단계

### 1. API Route 생성 (서버 사이드)
프론트엔드에서 직접 호출할 수 없으므로 API Route를 만들어야 합니다:

```typescript
// app/api/analytics/route.ts 또는 pages/api/analytics.ts

import { getComprehensiveStats } from '@/services/googleAnalytics';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stats = await getComprehensiveStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
```

### 2. 프론트엔드 컴포넌트 생성
API Route를 호출하는 컴포넌트:

```typescript
// components/AnalyticsDashboard.tsx

import { useEffect, useState } from 'react';

export function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load analytics:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>Failed to load</div>;

  return (
    <div className="analytics-dashboard">
      <h2>방문자 통계</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>오늘</h3>
          <p>{stats.today}명</p>
        </div>
        
        <div className="stat-card">
          <h3>어제</h3>
          <p>{stats.yesterday}명</p>
        </div>
        
        <div className="stat-card">
          <h3>최근 7일</h3>
          <p>{stats.last7Days}명</p>
        </div>
        
        <div className="stat-card">
          <h3>최근 30일</h3>
          <p>{stats.last30Days}명</p>
        </div>
        
        <div className="stat-card">
          <h3>전체</h3>
          <p>{stats.total}명</p>
        </div>
      </div>

      <div className="hourly-chart">
        <h3>시간대별 유입</h3>
        {stats.hourlyTraffic.map(h => (
          <div key={h.hour}>
            {h.hour}시: {h.visitors}명
          </div>
        ))}
      </div>

      <div className="regional-table">
        <h3>지역별 방문자 (상위 10개)</h3>
        <table>
          <thead>
            <tr>
              <th>국가</th>
              <th>지역</th>
              <th>도시</th>
              <th>방문자 수</th>
            </tr>
          </thead>
          <tbody>
            {stats.regionalTraffic.slice(0, 10).map((region, idx) => (
              <tr key={idx}>
                <td>{region.country}</td>
                <td>{region.region}</td>
                <td>{region.city}</td>
                <td>{region.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## ⚠️ 주의사항

### 1. 서버 사이드에서만 실행 가능
- Google Analytics Data API는 **서버 사이드에서만** 실행됩니다
- 브라우저(클라이언트)에서 직접 호출하면 에러 발생
- 반드시 API Route를 만들어서 사용하세요

### 2. 보안
- `hokex-498415-10f93dedf734.json` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 이미 추가되어 있습니다
- 배포 시 환경 변수나 시크릿으로 관리하세요

### 3. 할당량
- Google Analytics Data API는 **하루 25,000 requests까지 무료**입니다
- 초과 시 API가 차단됩니다 (추가 비용 없음)
- 캐싱을 사용하여 API 호출을 최소화하세요

### 4. 데이터 지연
- Google Analytics 데이터는 **24~48시간 지연**될 수 있습니다
- 실시간 데이터는 제한적입니다
- 기존 실시간 방문자 추적 시스템은 그대로 유지하세요

## 🚀 배포 시 설정

### Vercel 배포
1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables
3. JSON 키 파일 내용을 환경 변수로 추가:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: JSON 파일 전체 내용 (JSON 문자열)

4. 코드에서 환경 변수 사용:
```typescript
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: credentials || undefined,
  keyFilename: credentials ? undefined : keyFilePath,
});
```

## 📚 참고 문서

- [Google Analytics Data API 문서](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Node.js 클라이언트 라이브러리](https://github.com/googleapis/nodejs-analytics-data)
- [할당량 및 한도](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)

## 💡 추가 기능 아이디어

1. **캐싱 구현**: API 호출을 줄이기 위해 Redis나 메모리 캐시 사용
2. **차트 시각화**: Chart.js, Recharts 등으로 그래프 표시
3. **실시간 대시보드**: 5분마다 자동 새로고침
4. **CSV 내보내기**: 통계를 CSV 파일로 다운로드
5. **이메일 리포트**: 주간/월간 통계를 이메일로 자동 발송
