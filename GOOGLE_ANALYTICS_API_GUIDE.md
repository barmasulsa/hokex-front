# Google Analytics API 사용 가이드

## 개요
Google Analytics Data API를 통해 대한민국과 해외 방문자 통계를 분리하여 조회할 수 있는 Supabase Edge Function이 구현되었습니다.

## Edge Function 배포

### 1. 환경 변수 설정
Supabase 프로젝트에서 다음 환경 변수를 설정해야 합니다:

```bash
# Supabase CLI를 통한 설정
supabase secrets set GA_PROPERTY_ID=538348093
supabase secrets set GA_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"hokex-498415",...}'
```

또는 Supabase Dashboard에서:
1. Project Settings → Edge Functions → Environment Variables
2. `GA_PROPERTY_ID`: `538348093`
3. `GA_SERVICE_ACCOUNT_KEY`: 전체 서비스 계정 JSON 내용

### 2. Edge Function 배포

```bash
cd hokex-front
supabase functions deploy get-ga-stats
```

## API 사용법

### Endpoint
```
POST https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `region` | string | `both` | `domestic` (대한민국만), `international` (해외만), `both` (둘 다) |

### 예제

#### 1. 대한민국 방문자만 조회
```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats?region=domestic',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  }
)

const data = await response.json()
// {
//   success: true,
//   data: {
//     domestic: {
//       today: 150,
//       yesterday: 200,
//       last7Days: 1200,
//       last15Days: 2400,
//       last30Days: 5000,
//       last3Months: 15000,
//       last6Months: 30000,
//       last365Days: 60000,
//       allTime: 100000
//     }
//   },
//   timestamp: "2026-06-05T10:30:00.000Z"
// }
```

#### 2. 해외 방문자만 조회
```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats?region=international',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  }
)

const data = await response.json()
// {
//   success: true,
//   data: {
//     international: {
//       today: 50,
//       yesterday: 60,
//       last7Days: 400,
//       ...
//     }
//   },
//   timestamp: "2026-06-05T10:30:00.000Z"
// }
```

#### 3. 대한민국 + 해외 모두 조회 (기본값)
```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/get-ga-stats',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  }
)

const data = await response.json()
// {
//   success: true,
//   data: {
//     domestic: { today: 150, yesterday: 200, ... },
//     international: { today: 50, yesterday: 60, ... }
//   },
//   timestamp: "2026-06-05T10:30:00.000Z"
// }
```

## React 컴포넌트 예제

### Hook 생성
```typescript
// src/hooks/useGoogleAnalytics.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface GAStats {
  today: number
  yesterday: number
  last7Days: number
  last15Days: number
  last30Days: number
  last3Months: number
  last6Months: number
  last365Days: number
  allTime: number
}

interface GAResponse {
  domestic?: GAStats
  international?: GAStats
}

export function useGoogleAnalytics(region: 'domestic' | 'international' | 'both' = 'both') {
  const [data, setData] = useState<GAResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)

        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'get-ga-stats',
          {
            body: {},
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (functionError) throw functionError

        if (functionData.success) {
          setData(functionData.data)
        } else {
          throw new Error(functionData.error || 'Failed to fetch analytics')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [region])

  return { data, loading, error }
}
```

### 대시보드 컴포넌트
```typescript
// src/pages/AnalyticsDashboard.tsx
import React from 'react'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'

export function AnalyticsDashboard() {
  const { data, loading, error } = useGoogleAnalytics('both')

  if (loading) {
    return <div>로딩 중...</div>
  }

  if (error) {
    return <div>에러: {error}</div>
  }

  return (
    <div className="analytics-dashboard">
      <h1>방문자 통계</h1>
      
      {/* 대한민국 방문자 */}
      <section>
        <h2>🇰🇷 대한민국 방문자</h2>
        <div className="stats-grid">
          <StatCard label="오늘" value={data?.domestic?.today || 0} />
          <StatCard label="어제" value={data?.domestic?.yesterday || 0} />
          <StatCard label="최근 7일" value={data?.domestic?.last7Days || 0} />
          <StatCard label="최근 30일" value={data?.domestic?.last30Days || 0} />
          <StatCard label="최근 3개월" value={data?.domestic?.last3Months || 0} />
          <StatCard label="전체" value={data?.domestic?.allTime || 0} />
        </div>
      </section>

      {/* 해외 방문자 */}
      <section>
        <h2>🌍 해외 방문자</h2>
        <div className="stats-grid">
          <StatCard label="오늘" value={data?.international?.today || 0} />
          <StatCard label="어제" value={data?.international?.yesterday || 0} />
          <StatCard label="최근 7일" value={data?.international?.last7Days || 0} />
          <StatCard label="최근 30일" value={data?.international?.last30Days || 0} />
          <StatCard label="최근 3개월" value={data?.international?.last3Months || 0} />
          <StatCard label="전체" value={data?.international?.allTime || 0} />
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString()}</div>
    </div>
  )
}
```

## 데이터 구조

### GAStats 인터페이스
```typescript
interface GAStats {
  today: number              // 오늘 방문자 수
  yesterday: number          // 어제 방문자 수
  last7Days: number          // 최근 7일 방문자 수
  last15Days: number         // 최근 15일 방문자 수
  last30Days: number         // 최근 30일 방문자 수
  last3Months: number        // 최근 3개월 방문자 수 (90일)
  last6Months: number        // 최근 6개월 방문자 수 (180일)
  last365Days: number        // 최근 1년 방문자 수
  allTime: number            // 전체 기간 방문자 수 (2020년 1월 1일부터)
}
```

## 주요 변경사항
1. ✅ 대한민국과 해외 방문자를 분리하여 조회 가능
2. ✅ `last3Months`, `last6Months` 통계 추가
3. ✅ Query parameter로 조회 지역 선택 가능 (`domestic`, `international`, `both`)
4. ✅ 병렬 요청으로 성능 최적화
5. ✅ CORS 설정으로 프론트엔드에서 직접 호출 가능

## 참고사항
- Edge Function은 Supabase 프로젝트에 배포되어야 사용 가능
- GA4 서비스 계정 키 파일이 환경 변수로 설정되어 있어야 함
- API 요청 시 Supabase Anon Key가 필요
- 데이터는 실시간이 아니며 GA4의 처리 지연(최대 24-48시간)이 있을 수 있음
