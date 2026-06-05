import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // URL 파라미터에서 region 파라미터 가져오기
    const url = new URL(req.url)
    const region = url.searchParams.get('region') || 'both'

    // 🔥 임시 Mock 데이터 반환 (실제 GA 대신)
    const mockDomesticStats = {
      today: 342,
      yesterday: 289,
      last7Days: 2156,
      last15Days: 4523,
      last30Days: 9834,
      last3Months: 28945,
      last6Months: 56782,
      last365Days: 124567,
      allTime: 198432,
    }

    const mockInternationalStats = {
      today: 87,
      yesterday: 72,
      last7Days: 589,
      last15Days: 1234,
      last30Days: 2567,
      last3Months: 7834,
      last6Months: 15678,
      last365Days: 34567,
      allTime: 56789,
    }

    let responseData: any = {}

    if (region === 'domestic') {
      responseData = {
        success: true,
        data: {
          domestic: mockDomesticStats,
        },
        timestamp: new Date().toISOString(),
      }
    } else if (region === 'international') {
      responseData = {
        success: true,
        data: {
          international: mockInternationalStats,
        },
        timestamp: new Date().toISOString(),
      }
    } else {
      responseData = {
        success: true,
        data: {
          domestic: mockDomesticStats,
          international: mockInternationalStats,
        },
        timestamp: new Date().toISOString(),
      }
    }

    console.log('✅ Mock GA4 데이터 반환:', responseData)

    return new Response(
      JSON.stringify(responseData),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ Mock 데이터 반환 실패:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
