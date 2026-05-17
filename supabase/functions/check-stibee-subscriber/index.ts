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

    console.log(`🔍 Checking subscription for email: ${email}`)
    console.log(`📋 Using List ID: ${STIBEE_LIST_ID}`)
    console.log(`🔑 API Key length: ${STIBEE_API_KEY?.length || 0}`)
    
    // Stibee API v2 사용: 전체 구독자 목록 조회
    const apiUrl = `https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`
    console.log(`🌐 Calling Stibee API: ${apiUrl}`)
    
    const stibeeResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
      },
    })

    console.log(`📡 Stibee API v2 response status: ${stibeeResponse.status}`)
    console.log(`📡 Response headers:`, Object.fromEntries(stibeeResponse.headers.entries()))

    if (stibeeResponse.ok) {
      const responseData = await stibeeResponse.json()
      console.log('📦 Full Stibee API response:', JSON.stringify(responseData, null, 2))
      console.log('🔑 Response keys:', Object.keys(responseData))
      
      // API 응답 구조 확인 - 다양한 가능성 체크
      let subscribers = []
      if (Array.isArray(responseData)) {
        subscribers = responseData
        console.log('✅ Response is array')
      } else if (responseData.subscribers) {
        subscribers = responseData.subscribers
        console.log('✅ Found subscribers array in response.subscribers')
      } else if (responseData.data) {
        subscribers = responseData.data
        console.log('✅ Found subscribers array in response.data')
      } else if (responseData.list) {
        subscribers = responseData.list
        console.log('✅ Found subscribers array in response.list')
      } else {
        console.log('❌ Could not find subscribers array in response')
      }
      
      console.log(`👥 Total subscribers in list: ${subscribers.length}`)
      
      if (subscribers.length > 0) {
        console.log('📝 First subscriber sample:', JSON.stringify(subscribers[0], null, 2))
      }
      
      // 이메일로 구독자 찾기 (대소문자 구분 없이)
      const normalizedEmail = email.toLowerCase().trim()
      console.log(`🔎 Searching for normalized email: ${normalizedEmail}`)
      
      const subscriber = subscribers.find((sub: any) => {
        const subEmail = (sub.email || sub.Email || sub.EMAIL || '').toLowerCase().trim()
        return subEmail === normalizedEmail
      })
      
      if (subscriber) {
        // 구독 상태 확인
        const status = subscriber.status || subscriber.state || subscriber.Status || subscriber.STATE || 'UNKNOWN'
        const isSubscribed = status === 'SUBSCRIBED' || status === 'subscribed' || status === 'ACTIVE' || status === 'active' || status === '구독 중'
        
        console.log(`✅ Subscriber found!`)
        console.log(`   Email: ${subscriber.email || subscriber.Email}`)
        console.log(`   Status: ${status}`)
        console.log(`   Is subscribed: ${isSubscribed}`)
        
        return new Response(
          JSON.stringify({ 
            isSubscriber: isSubscribed,
            email: email,
            status: status,
            subscriberData: subscriber,
            debug: {
              totalSubscribers: subscribers.length,
              responseStructure: Object.keys(responseData)
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log(`❌ Subscriber not found in list for email: ${email}`)
        console.log(`   Searched ${subscribers.length} subscribers`)
        
        return new Response(
          JSON.stringify({ 
            isSubscriber: false,
            email: email,
            message: 'Not a subscriber',
            debug: {
              totalSubscribers: subscribers.length,
              responseStructure: Object.keys(responseData),
              sampleEmails: subscribers.slice(0, 3).map((s: any) => s.email || s.Email)
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const errorText = await stibeeResponse.text()
      console.error('❌ Stibee API v2 error:', stibeeResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify subscription', 
          isSubscriber: false,
          details: errorText,
          statusCode: stibeeResponse.status
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
