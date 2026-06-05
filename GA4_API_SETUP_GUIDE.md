# Google Analytics 4 API 연동 가이드

## 📊 GA4 통계를 관리자 페이지에 표시하기

현재 사이트에는 Google Analytics 4가 설치되어 있습니다 (Measurement ID: `G-4SHZ77PG3Y`).
하지만 프론트엔드에서 직접 GA4 통계를 가져오려면 **서버 사이드 구현**이 필요합니다.

## 🔧 구현 방법

### 옵션 1: Google Analytics 대시보드 사용 (현재 구현됨)
- **장점**: 설정 불필요, 즉시 사용 가능, 모든 상세 통계 제공
- **단점**: 외부 사이트로 이동 필요
- **구현**: "Google Analytics 대시보드 열기" 버튼 클릭

### 옵션 2: GA4 Data API + Supabase Edge Function (권장)
프론트엔드에서 통계를 직접 표시하려면 서버 사이드 구현이 필요합니다.

#### 필요한 작업:
1. **Google Cloud Console 설정**
   - Google Cloud 프로젝트 생성
   - Google Analytics Data API 활성화
   - 서비스 계정 생성 및 JSON 키 다운로드
   - GA4 속성에 서비스 계정 추가 (뷰어 권한)

2. **GA4 Property ID 확인**
   - Google Analytics → 관리 → 속성 설정
   - 속성 ID 복사 (예: `123456789`)

3. **Supabase Edge Function 생성**
```typescript
// supabase/functions/get-ga-stats/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { BetaAnalyticsDataClient } from 'npm:@google-analytics/data@3.2.0'

const propertyId = 'YOUR_GA4_PROPERTY_ID' // 예: '123456789'

serve(async (req) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    // 서비스 계정 JSON 키를 환경 변수에서 로드
    const credentials = JSON.parse(Deno.env.get('GA_SERVICE_ACCOUNT_KEY') || '{}')
    
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    })

    // 오늘 방문자
    const todayResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 어제 방문자
    const yesterdayResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 최근 7일
    const last7DaysResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 최근 15일
    const last15DaysResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '15daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 최근 30일
    const last30DaysResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 최근 1년
    const last365DaysResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '365daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    // 전체 기간
    const allTimeResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    const stats = {
      today: parseInt(todayResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      yesterday: parseInt(yesterdayResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      last7Days: parseInt(last7DaysResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      last15Days: parseInt(last15DaysResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      last30Days: parseInt(last30DaysResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      last365Days: parseInt(last365DaysResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
      allTime: parseInt(allTimeResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0'),
    }

    return new Response(JSON.stringify(stats), { headers })
  } catch (error) {
    console.error('Error fetching GA stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    )
  }
})
```

4. **환경 변수 설정**
```bash
# Supabase 프로젝트에 시크릿 추가
supabase secrets set GA_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

5. **Edge Function 배포**
```bash
supabase functions deploy get-ga-stats
```

6. **프론트엔드에서 호출**
```typescript
// src/utils/googleAnalytics.ts
export async function fetchGAStats() {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ga-stats`,
    {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch GA stats')
  }
  
  return response.json()
}
```

## 📝 요약

**현재 상황:**
- ✅ Google Analytics 4 설치됨 (G-4SHZ77PG3Y)
- ✅ 대시보드 링크 버튼 구현됨
- ⏳ 프론트엔드에서 직접 통계 표시는 서버 사이드 구현 필요

**권장 방안:**
1. **단기**: Google Analytics 대시보드 사용 (현재 구현됨)
2. **장기**: 위 가이드에 따라 Supabase Edge Function 구현

## 🚀 빠른 대안: Embedded GA Dashboard

GA4 대시보드를 iframe으로 임베드하는 방법도 있습니다:
```typescript
<iframe
  src="https://lookerstudio.google.com/embed/reporting/YOUR_REPORT_ID/page/YOUR_PAGE_ID"
  style={{ width: '100%', height: '800px', border: 'none' }}
/>
```

이 방법은 Google Looker Studio(구 Data Studio)에서 보고서를 만들고 공유 링크를 생성하면 됩니다.

## ⚠️ 참고사항

- GA4 API는 무료 할당량이 있습니다 (하루 50,000 요청)
- 실시간 데이터는 약 30분 지연됩니다
- 서비스 계정 키는 절대 프론트엔드에 노출하면 안 됩니다
