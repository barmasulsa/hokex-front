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
    // Supabase 클라이언트 생성 (Service Role 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Stibee API 설정
    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('❌ Stibee API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Starting Stibee subscriber sync...`)

    // Stibee API로 전체 구독자 목록 조회 (page 방식 페이지네이션)
    let allSubscribers: any[] = []
    let page = 0
    let hasMore = true
    const limit = 1000
    const MAX_PAGES = 20  // 최대 20페이지 (20,000명)

    while (hasMore && page < MAX_PAGES) {
      const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers?page=${page}&limit=${limit}`
      console.log(`📡 Fetching page ${page}...`)

      const stibeeResponse = await fetch(stibeeUrl, {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!stibeeResponse.ok) {
        console.error(`❌ Stibee API error: ${stibeeResponse.status}`)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscribers from Stibee' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const stibeeData = await stibeeResponse.json()
      
      // 응답 구조 파악
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

    console.log(`📊 Total subscribers fetched: ${allSubscribers.length}`)

    // DB에 저장 (upsert)
    const subscribersToInsert = allSubscribers.map(sub => ({
      email: sub.email?.toLowerCase().trim(),
      subscribed_at: sub.subscribedAt || sub.created_at || new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })).filter(sub => sub.email) // 이메일이 있는 것만

    console.log(`💾 Upserting ${subscribersToInsert.length} subscribers to DB...`)

    // 배치로 나눠서 저장 (한 번에 너무 많으면 타임아웃)
    const BATCH_SIZE = 500
    let insertedCount = 0
    let errorCount = 0

    for (let i = 0; i < subscribersToInsert.length; i += BATCH_SIZE) {
      const batch = subscribersToInsert.slice(i, i + BATCH_SIZE)
      
      const { error } = await supabase
        .from('stibee_subscribers')
        .upsert(batch, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error)
        errorCount += batch.length
      } else {
        insertedCount += batch.length
        console.log(`✅ Batch ${i / BATCH_SIZE + 1} inserted: ${batch.length} records`)
      }
    }

    // 동기화되지 않은 오래된 구독자 삭제 (선택사항)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { error: deleteError } = await supabase
      .from('stibee_subscribers')
      .delete()
      .lt('last_synced_at', oneHourAgo)

    if (deleteError) {
      console.error('❌ Error deleting old subscribers:', deleteError)
    }

    console.log(`✅ Sync completed: ${insertedCount} inserted, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true,
        totalFetched: allSubscribers.length,
        inserted: insertedCount,
        errors: errorCount,
        syncedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
