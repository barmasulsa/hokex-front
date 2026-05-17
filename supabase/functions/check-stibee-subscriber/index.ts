import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required', isSubscriber: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('Missing Stibee configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking subscription for email: ${email}`)
    console.log(`Using List ID: ${STIBEE_LIST_ID}`)
    
    // Stibee API v2 사용: 전체 구독자 목록 조회
    const stibeeResponse = await fetch(
      `https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`,
      {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
        },
      }
    )

    console.log(`Stibee API v2 response status: ${stibeeResponse.status}`)

    if (stibeeResponse.ok) {
      const responseData = await stibeeResponse.json()
      console.log('Stibee API v2 response structure:', Object.keys(responseData))
      
      // API 응답 구조 확인 (subscribers 배열이 있을 것으로 예상)
      const subscribers = responseData.subscribers || responseData.data || []
      console.log(`Total subscribers in list: ${subscribers.length}`)
      
      // 이메일로 구독자 찾기 (대소문자 구분 없이)
      const normalizedEmail = email.toLowerCase().trim()
      const subscriber = subscribers.find((sub: any) => {
        const subEmail = (sub.email || '').toLowerCase().trim()
        return subEmail === normalizedEmail
      })
      
      if (subscriber) {
        // 구독 상태 확인
        const status = subscriber.status || subscriber.state || 'UNKNOWN'
        const isSubscribed = status === 'SUBSCRIBED' || status === 'subscribed' || status === 'ACTIVE' || status === 'active' || status === '구독 중'
        
        console.log(`Subscriber found - Email: ${subscriber.email}, Status: ${status}, Is subscribed: ${isSubscribed}`)
        
        return new Response(
          JSON.stringify({ 
            isSubscriber: isSubscribed,
            email: email,
            status: status,
            subscriberData: subscriber
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log(`Subscriber not found in list for email: ${email}`)
        return new Response(
          JSON.stringify({ 
            isSubscriber: false,
            email: email,
            message: 'Not a subscriber' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const errorText = await stibeeResponse.text()
      console.error('Stibee API v2 error:', stibeeResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify subscription', 
          isSubscriber: false,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', isSubscriber: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
