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

    const ADMIN_EMAIL = 'lcw5525@naver.com'
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedAdminEmail = ADMIN_EMAIL.toLowerCase().trim()

    console.log(`🔍 Checking subscription for email: ${email}`)

    // Stibee API 설정
    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('❌ Stibee API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stibee API로 구독자 목록 조회
    const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers`
    console.log(`📡 Fetching subscribers from Stibee: ${stibeeUrl}`)

    const stibeeResponse = await fetch(stibeeUrl, {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!stibeeResponse.ok) {
      console.error(`❌ Stibee API error: ${stibeeResponse.status} ${stibeeResponse.statusText}`)
      const errorText = await stibeeResponse.text()
      console.error(`Error details: ${errorText}`)
      return new Response(
        JSON.stringify({ error: 'Failed to check subscription', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stibeeData = await stibeeResponse.json()
    console.log(`📊 Stibee response received, total subscribers: ${stibeeData.Ok?.length || 0}`)

    // 구독자 목록에서 이메일 검색
    const subscribers = stibeeData.Ok || []
    const isSubscriber = subscribers.some((subscriber: any) => {
      const subscriberEmail = subscriber.email?.toLowerCase().trim()
      return subscriberEmail === normalizedEmail
    })

    console.log(`🔍 Email ${email} found in Stibee: ${isSubscriber}`)

    if (!isSubscriber) {
      console.log(`❌ Not a subscriber: ${email}`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not a subscriber'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 구독자인 경우 - 관리자 여부 체크
    const isAdmin = normalizedEmail === normalizedAdminEmail

    console.log(`✅ Subscriber access granted for: ${email}`)
    console.log(`🔑 Is admin: ${isAdmin}`)

    return new Response(
      JSON.stringify({ 
        isSubscriber: true,
        isAdmin: isAdmin,
        email: email,
        status: isAdmin ? 'ADMIN' : 'SUBSCRIBER',
        message: isAdmin ? 'Admin access granted' : 'Subscriber access granted'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', isSubscriber: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
