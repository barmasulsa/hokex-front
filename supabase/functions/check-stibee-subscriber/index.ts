// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

    const ADMIN_EMAILS = ['lcw5525@naver.com']
    const normalizedEmail = email.toLowerCase().trim()

    console.log(`🔍 Checking subscription for email: ${email}`)

    // 관리자 이메일은 바로 통과
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      console.log(`✅ Admin email detected, granting access immediately`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: true,
          isAdmin: true,
          email: email,
          status: 'ADMIN',
          message: 'Admin access granted'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // DB에서 구독자 확인 (1차 체크)
    console.log(`🔍 Checking DB for subscriber: ${normalizedEmail}`)
    const { data: dbSubscriber, error: dbError } = await supabase
      .from('stibee_subscribers')
      .select('email, last_synced_at')
      .eq('email', normalizedEmail)
      .single()

    if (dbSubscriber && !dbError) {
      console.log(`✅ Found in DB, last synced: ${dbSubscriber.last_synced_at}`)
      const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)
      
      return new Response(
        JSON.stringify({ 
          isSubscriber: true,
          isAdmin: isAdmin,
          email: email,
          status: isAdmin ? 'ADMIN' : 'SUBSCRIBER',
          message: 'Subscriber access granted (from DB)',
          lastSynced: dbSubscriber.last_synced_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`⚠️ Not found in DB, checking Stibee API directly...`)

    // DB에 없으면 Stibee API 직접 조회 (2차 체크 - 실시간)
    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('❌ Stibee API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stibee API로 구독자 목록 조회 (페이지네이션 포함)
    console.log(`� Fetching all subscribers from Stibee with pagination...`)
    
    let allSubscribers: any[] = []
    let page = 0
    let hasMore = true
    const limit = 1000
    const MAX_PAGES = 10

    while (hasMore && page < MAX_PAGES) {
      const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers?page=${page}&limit=${limit}`
      console.log(`📡 Fetching page ${page}: ${stibeeUrl}`)

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
      console.log(`📊 Page ${page} response keys:`, Object.keys(stibeeData))

      let pageSubscribers: any[] = []
      
      if (Array.isArray(stibeeData)) {
        pageSubscribers = stibeeData
      } else if (stibeeData.Value && Array.isArray(stibeeData.Value)) {
        pageSubscribers = stibeeData.Value
      } else if (stibeeData.value && Array.isArray(stibeeData.value)) {
        pageSubscribers = stibeeData.value
      } else if (stibeeData.Ok && Array.isArray(stibeeData.Ok)) {
        pageSubscribers = stibeeData.Ok
      } else if (stibeeData.data && Array.isArray(stibeeData.data)) {
        pageSubscribers = stibeeData.data
      } else if (stibeeData.subscribers && Array.isArray(stibeeData.subscribers)) {
        pageSubscribers = stibeeData.subscribers
      } else {
        console.error('❌ Cannot find subscribers array in response')
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Stibee API response format', 
            isSubscriber: false
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📊 Page ${page}: ${pageSubscribers.length} subscribers`)
      
      if (!pageSubscribers || pageSubscribers.length === 0) {
        console.log(`✅ Reached end of subscribers (empty page)`)
        hasMore = false
      } else {
        allSubscribers = allSubscribers.concat(pageSubscribers)
        
        if (pageSubscribers.length < limit) {
          console.log(`✅ Reached end of subscribers (${pageSubscribers.length} < ${limit})`)
          hasMore = false
        } else {
          page++
        }
      }
    }

    if (page >= MAX_PAGES) {
      console.log(`⚠️ Reached maximum page limit (${MAX_PAGES} pages)`)
    }

    const subscribers = allSubscribers
    console.log(`📊 Total subscribers fetched: ${subscribers.length}`)

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

    // 구독자 발견 - DB에 저장
    console.log(`💾 Saving subscriber to DB: ${normalizedEmail}`)
    await supabase
      .from('stibee_subscribers')
      .upsert({ 
        email: normalizedEmail,
        last_synced_at: new Date().toISOString()
      }, { 
        onConflict: 'email' 
      })

    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)

    console.log(`✅ Subscriber access granted for: ${email}`)
    console.log(`🔑 Is admin: ${isAdmin}`)

    return new Response(
      JSON.stringify({ 
        isSubscriber: true,
        isAdmin: isAdmin,
        email: email,
        status: isAdmin ? 'ADMIN' : 'SUBSCRIBER',
        message: isAdmin ? 'Admin access granted' : 'Subscriber access granted (from API)'
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
