import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

interface GAStatsResponse {
  success: boolean
  data: {
    domestic: GAStats
    international: GAStats
  }
  timestamp: string
}

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Mock 데이터 모드 - Google Analytics 권한 설정 전까지 임시 데이터 반환')

    // URL 파라미터에서 region 파라미터 가져오기
    const url = new URL(req.url)
    const region = url.searchParams.get('region') || 'both'

    // Mock 데이터 생성 함수
    const createMockStats = (): GAStats => ({
      today: Math.floor(Math.random() * 500) + 100,
      yesterday: Math.floor(Math.random() * 500) + 100,
      last7Days: Math.floor(Math.random() * 2000) + 500,
      last15Days: Math.floor(Math.random() * 3500) + 1000,
      last30Days: Math.floor(Math.random() * 6000) + 2000,
      last3Months: Math.floor(Math.random() * 15000) + 5000,
      last6Months: Math.floor(Math.random() * 25000) + 10000,
      last365Days: Math.floor(Math.random() * 50000) + 20000,
      allTime: Math.floor(Math.random() * 100000) + 50000,
    })

    let responseData: any = {}

    if (region === 'domestic') {
      responseData = {
        success: true,
        data: {
          domestic: createMockStats(),
        },
        timestamp: new Date().toISOString(),
        _mock: true,
        _message: 'Mock 데이터입니다. Google Analytics 권한 설정 후 실제 데이터로 전환됩니다.',
      }
      console.log('✅ Mock GA4 통계 반환 (대한민국)')
    } else if (region === 'international') {
      responseData = {
        success: true,
        data: {
          international: createMockStats(),
        },
        timestamp: new Date().toISOString(),
        _mock: true,
        _message: 'Mock 데이터입니다. Google Analytics 권한 설정 후 실제 데이터로 전환됩니다.',
      }
      console.log('✅ Mock GA4 통계 반환 (해외)')
    } else {
      responseData = {
        success: true,
        data: {
          domestic: createMockStats(),
          international: createMockStats(),
        },
        timestamp: new Date().toISOString(),
        _mock: true,
        _message: 'Mock 데이터입니다. Google Analytics 권한 설정 후 실제 데이터로 전환됩니다.',
      }
      console.log('✅ Mock GA4 통계 반환 (전체)')
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Mock 데이터 생성 실패:', error)

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
