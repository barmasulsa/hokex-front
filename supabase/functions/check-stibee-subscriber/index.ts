import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required', isSubscriber: false }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 스티비 API 설정
    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('Missing Stibee configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 스티비 API 호출: 구독자 조회
    const stibeeResponse = await fetch(
      `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    // 구독자가 존재하고 구독 상태인지 확인
    if (stibeeResponse.ok) {
      const subscriberData = await stibeeResponse.json()
      
      // 구독 상태 확인 (SUBSCRIBED 상태만 허용)
      const isSubscribed = subscriberData.status === 'SUBSCRIBED'
      
      return new Response(
        JSON.stringify({ 
          isSubscriber: isSubscribed,
          email: email,
          status: subscriberData.status 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (stibeeResponse.status === 404) {
      // 구독자가 없음
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not a subscriber' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('Stibee API error:', stibeeResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to verify subscription', isSubscriber: false }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', isSubscriber: false }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
