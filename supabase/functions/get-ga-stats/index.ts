import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts'

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

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

// Google Analytics Data API에서 액세스 토큰 가져오기
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // private_key에서 개행 문자 복원
  const privateKey = serviceAccountKey.private_key.replace(/\\n/g, '\n')
  
  // PEM 형식에서 헤더/푸터 제거하고 base64 디코딩
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')
  
  // base64 디코딩
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  // PKCS#8 형식의 private key를 CryptoKey로 변환
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // JWT 생성
  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, keyData)

  // Access token 요청
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Failed to get access token: ${errorText}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// 날짜 범위로 GA4 통계 조회
async function getGA4Stats(
  propertyId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensionFilter?: any
): Promise<number> {
  const requestBody: any = {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'activeUsers' }],
  }

  // 국가 필터 추가
  if (dimensionFilter) {
    requestBody.dimensionFilter = dimensionFilter
  }

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GA4 API Error: ${errorText}`)
  }

  const data = await response.json()
  
  // activeUsers 합계 반환
  if (data.rows && data.rows.length > 0) {
    return parseInt(data.rows[0].metricValues[0].value || '0')
  }
  
  return 0
}

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경 변수 확인
    const propertyId = Deno.env.get('GA_PROPERTY_ID')
    const serviceAccountKeyJson = Deno.env.get('GA_SERVICE_ACCOUNT_KEY')

    if (!propertyId || !serviceAccountKeyJson) {
      console.error('❌ GA4 credentials not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GA4 credentials not configured. Please set GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY environment variables.',
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ GA_PROPERTY_ID:', propertyId)
    console.log('✅ Service Account Key length:', serviceAccountKeyJson.length)
    console.log('✅ First 100 chars:', serviceAccountKeyJson.substring(0, 100))
    console.log('✅ Last 100 chars:', serviceAccountKeyJson.substring(serviceAccountKeyJson.length - 100))

    // Service Account Key 파싱
    let serviceAccountKey
    try {
      serviceAccountKey = JSON.parse(serviceAccountKeyJson)
      console.log('✅ JSON parsing successful')
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message)
      console.error('❌ Problematic JSON substring (0-200):', serviceAccountKeyJson.substring(0, 200))
      throw new Error(`Failed to parse Service Account JSON: ${parseError.message}`)
    }
    
    // Access Token 가져오기
    console.log('🔑 Getting access token...')
    const accessToken = await getAccessToken(serviceAccountKey)
    console.log('✅ Access token obtained')

    // URL 파라미터에서 region 파라미터 가져오기
    const url = new URL(req.url)
    const region = url.searchParams.get('region') || 'both'

    // 국가 필터 설정
    const domesticFilter = {
      filter: {
        fieldName: 'country',
        stringFilter: {
          matchType: 'EXACT',
          value: 'South Korea',
        },
      },
    }

    const internationalFilter = {
      notExpression: {
        filter: {
          fieldName: 'country',
          stringFilter: {
            matchType: 'EXACT',
            value: 'South Korea',
          },
        },
      },
    }

    // 날짜 범위별 통계 조회 함수
    const fetchStats = async (filter?: any): Promise<GAStats> => {
      const [today, yesterday, last7Days, last15Days, last30Days, last3Months, last6Months, last365Days, allTime] = await Promise.all([
        getGA4Stats(propertyId, accessToken, 'today', 'today', filter),
        getGA4Stats(propertyId, accessToken, 'yesterday', 'yesterday', filter),
        getGA4Stats(propertyId, accessToken, '7daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '15daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '30daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '90daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '180daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '365daysAgo', 'today', filter),
        getGA4Stats(propertyId, accessToken, '2020-01-01', 'today', filter),
      ])

      return {
        today,
        yesterday,
        last7Days,
        last15Days,
        last30Days,
        last3Months,
        last6Months,
        last365Days,
        allTime,
      }
    }

    let responseData: any = {}

    if (region === 'domestic') {
      console.log('📊 Fetching domestic stats...')
      const domesticStats = await fetchStats(domesticFilter)
      responseData = {
        success: true,
        data: { domestic: domesticStats },
        timestamp: new Date().toISOString(),
      }
      console.log('✅ Domestic stats fetched:', domesticStats)
    } else if (region === 'international') {
      console.log('📊 Fetching international stats...')
      const internationalStats = await fetchStats(internationalFilter)
      responseData = {
        success: true,
        data: { international: internationalStats },
        timestamp: new Date().toISOString(),
      }
      console.log('✅ International stats fetched:', internationalStats)
    } else {
      console.log('📊 Fetching both domestic and international stats...')
      const [domesticStats, internationalStats] = await Promise.all([
        fetchStats(domesticFilter),
        fetchStats(internationalFilter),
      ])
      responseData = {
        success: true,
        data: {
          domestic: domesticStats,
          international: internationalStats,
        },
        timestamp: new Date().toISOString(),
      }
      console.log('✅ Both stats fetched')
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Error fetching GA4 stats:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        stack: error.stack,
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
