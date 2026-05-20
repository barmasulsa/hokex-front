// Stibee 웹훅 핸들러
// 새 구독자가 생기면 자동으로 DB에 저장

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 웹훅 데이터 파싱
    const payload = await req.json()
    console.log('Stibee webhook received:', payload)

    // Stibee 웹훅 이벤트 타입 확인
    const eventType = payload.eventOccuredBy || payload.event_type
    
    // 구독 이벤트만 처리 (subscribe, unsubscribe 등)
    if (eventType === 'subscribe' || eventType === 'SUBSCRIBED') {
      const email = payload.subscriber?.email || payload.email
      
      if (!email) {
        console.error('No email in webhook payload')
        return new Response(
          JSON.stringify({ error: 'No email provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DB에 구독자 추가 (중복 시 무시)
      const { data, error } = await supabase
        .from('stibee_subscribers')
        .upsert(
          { 
            email: email.toLowerCase(),
            subscribed_at: new Date().toISOString(),
            source: 'webhook'
          },
          { 
            onConflict: 'email',
            ignoreDuplicates: false 
          }
        )

      if (error) {
        console.error('Error inserting subscriber:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Subscriber added/updated:', email)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscriber synced',
          email 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 구독 취소 이벤트 처리
    if (eventType === 'unsubscribe' || eventType === 'UNSUBSCRIBED') {
      const email = payload.subscriber?.email || payload.email
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'No email provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DB에서 구독자 삭제
      const { error } = await supabase
        .from('stibee_subscribers')
        .delete()
        .eq('email', email.toLowerCase())

      if (error) {
        console.error('Error deleting subscriber:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Subscriber removed:', email)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscriber removed',
          email 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 기타 이벤트는 로그만 남기고 성공 응답
    console.log('Unhandled event type:', eventType)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event received but not processed',
        eventType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
