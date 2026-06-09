import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { domain } = await req.json()
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. visitor_sites에서 site_id 찾기 or 생성
    const { data: site, error: siteError } = await supabaseClient
      .from('visitor_sites')
      .select('id')
      .eq('domain', domain)
      .single()

    let siteId: string

    if (siteError && siteError.code === 'PGRST116') {
      // 사이트 없으면 생성
      const { data: newSite, error: createError } = await supabaseClient
        .from('visitor_sites')
        .insert({ domain, total_count: 0, today_count: 0 })
        .select('id')
        .single()

      if (createError) throw createError
      siteId = newSite.id
    } else if (siteError) {
      throw siteError
    } else {
      siteId = site.id
    }

    // 2. 방문자 해시 생성 (IP + User-Agent)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${ip}:${userAgent}`)
    )
    const visitorHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // 3. 중복 체크 (20분 TTL)
    const { data: existing } = await supabaseClient
      .from('visitor_dedup')
      .select('id')
      .eq('site_id', siteId)
      .eq('visitor_hash', visitorHash)
      .gt('ttl_expiry', new Date().toISOString())
      .single()

    if (existing) {
      // 중복 방문 - 카운트하지 않음
      const { data: stats } = await supabaseClient
        .from('visitor_sites')
        .select('total_count, today_count')
        .eq('id', siteId)
        .single()

      return new Response(
        JSON.stringify({ 
          totalCount: stats?.total_count || 0, 
          todayCount: stats?.today_count || 0,
          duplicate: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 새 방문 기록
    const now = new Date()
    const ttlExpiry = new Date(now.getTime() + 20 * 60 * 1000) // 20분 후

    // Dedup 테이블에 추가
    await supabaseClient
      .from('visitor_dedup')
      .insert({
        site_id: siteId,
        visitor_hash: visitorHash,
        ttl_expiry: ttlExpiry.toISOString()
      })

    // Log 테이블에 추가
    await supabaseClient
      .from('visitor_logs')
      .insert({
        site_id: siteId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        visitor_ip: ip,
        user_agent: userAgent
      })

    // 5. 카운트 증가
    const today = new Date().toISOString().split('T')[0]
    
    // total_count는 무조건 증가
    // today_count는 last_visit_date가 오늘이면 증가, 아니면 1로 리셋
    const { data: currentSite } = await supabaseClient
      .from('visitor_sites')
      .select('total_count, today_count, last_visit_date')
      .eq('id', siteId)
      .single()

    const newTotalCount = (currentSite?.total_count || 0) + 1
    const newTodayCount = currentSite?.last_visit_date === today 
      ? (currentSite?.today_count || 0) + 1 
      : 1

    const { data: updated, error: updateError } = await supabaseClient
      .from('visitor_sites')
      .update({
        total_count: newTotalCount,
        today_count: newTodayCount,
        last_visit_date: today,
        updated_at: now.toISOString()
      })
      .eq('id', siteId)
      .select('total_count, today_count')
      .single()

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        totalCount: updated.total_count, 
        todayCount: updated.today_count,
        duplicate: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
