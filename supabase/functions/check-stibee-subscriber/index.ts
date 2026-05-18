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

    // 🔒 관리자 이메일 체크 - lcw5525@naver.com만 관리자 권한
    const ADMIN_EMAIL = 'lcw5525@naver.com'
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedAdminEmail = ADMIN_EMAIL.toLowerCase().trim()

    console.log(`🔍 Checking admin access for email: ${email}`)
    console.log(`🔑 Admin email: ${ADMIN_EMAIL}`)
    console.log(`✅ Is admin: ${normalizedEmail === normalizedAdminEmail}`)

    if (normalizedEmail === normalizedAdminEmail) {
      console.log(`✅ Admin access granted for: ${email}`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: true,
          email: email,
          status: 'ADMIN',
          message: 'Admin access granted'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log(`❌ Not admin: ${email}`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not authorized - admin only'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
