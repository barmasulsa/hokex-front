// 이 코드를 Supabase Dashboard에 전체 복사-붙여넣기 하세요
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

    // ⭐⭐⭐ 개발 우회: 특정 이메일은 항상 허용 ⭐⭐⭐
    const ALLOWED_EMAILS = ['lcw5525@naver.com']
    if (ALLOWED_EMAILS.includes(email.toLowerCase())) {
      console.log(`✅ Development bypass: ${email} is in allowed list`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: true,
          email: email,
          status: 'DEVELOPMENT_BYPASS'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking subscription for email: ${email}`)
    console.log(`Using List ID: ${STIBEE_LIST_ID}`)
    
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

    console.log(`Stibee API response status: ${stibeeResponse.status}`)

    if (stibeeResponse.ok) {
      const subscriberData = await stibeeResponse.json()
      console.log('Full Stibee response:', JSON.stringify(subscriberData, null, 2))
      
      const status = subscriberData.status || subscriberData.subscriber?.status || subscriberData.state
      const isSubscribed = status === 'SUBSCRIBED' || status === 'subscribed' || status === 'ACTIVE' || status === 'active'
      
      console.log(`Is subscribed: ${isSubscribed}, Status: ${status}`)
      
      return new Response(
        JSON.stringify({ 
          isSubscriber: isSubscribed,
          email: email,
          status: status,
          rawData: subscriberData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (stibeeResponse.status === 404) {
      console.log('Subscriber not found (404)')
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not a subscriber' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorText = await stibeeResponse.text()
      console.error('Stibee API error:', stibeeResponse.status, errorText)
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
