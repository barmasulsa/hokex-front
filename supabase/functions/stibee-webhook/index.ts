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
    console.log('🔔 Webhook received from Stibee')

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 웹훅 데이터 파싱
    const webhookData = await req.json()
    console.log('📦 Webhook data:', JSON.stringify(webhookData, null, 2))

    // 스티비 웹훅 이벤트 타입 확인
    const eventType = webhookData.eventOccuredBy || webhookData.eventType || webhookData.type
    console.log(`📌 Event type: ${eventType}`)

    // 구독자 이메일 추출 (스티비 웹훅 구조에 따라 다를 수 있음)
    let email = webhookData.email || 
                webhookData.subscriber?.email || 
                webhookData.data?.email ||
                webhookData.subscriberEmail

    if (!email) {
      console.error('❌ No email found in webhook data')
      console.error('Webhook structure:', Object.keys(webhookData))
      
      // 전체 동기화 트리거 (이메일을 찾을 수 없는 경우)
      console.log('🔄 Triggering full sync instead...')
      const syncUrl = 'https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers'
      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (syncResponse.ok) {
        console.log('✅ Full sync triggered successfully')
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received, full sync triggered',
          eventType: eventType
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`📧 Processing email: ${normalizedEmail}`)

    // 이벤트 타입에 따라 처리
    if (eventType === 'unsubscribe' || eventType === 'UNSUBSCRIBE') {
      // 구독 취소 - DB에서 삭제
      console.log(`🗑️ Unsubscribe event for: ${normalizedEmail}`)
      const { error } = await supabase
        .from('stibee_subscribers')
        .delete()
        .eq('email', normalizedEmail)

      if (error) {
        console.error('❌ Error deleting subscriber:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete subscriber' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ Subscriber removed: ${normalizedEmail}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'unsubscribe',
          email: normalizedEmail 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // 구독 추가 또는 업데이트 - DB에 저장
      console.log(`➕ Subscribe event for: ${normalizedEmail}`)
      const { error } = await supabase
        .from('stibee_subscribers')
        .upsert({ 
          email: normalizedEmail,
          subscribed_at: webhookData.subscribedAt || new Date().toISOString(),
          last_synced_at: new Date().toISOString()
        }, { 
          onConflict: 'email',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('❌ Error upserting subscriber:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to add subscriber' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ Subscriber added/updated: ${normalizedEmail}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'subscribe',
          email: normalizedEmail 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
