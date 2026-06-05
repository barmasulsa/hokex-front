// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase Admin 클라이언트 생성 (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. DB에서 OTP 코드 검증
    const { data: verificationData, error: verifyError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 코드가 존재하지 않거나 이미 사용됨 또는 만료됨
    if (verifyError || !verificationData) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired code',
          message: '인증 코드가 유효하지 않거나 만료되었습니다.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 이미 사용된 코드인지 확인
    if (verificationData.used_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Code already used',
          message: '이미 사용된 인증 코드입니다.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 만료된 코드인지 확인
    if (new Date(verificationData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Code expired',
          message: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 코드 사용 처리
    await supabaseAdmin
      .from('email_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationData.id);

    // 3. 사용자 인증 (비밀번호 없이 OTP로 인증된 것으로 간주)
    // OTP Magic Link로 토큰 생성
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError) {
      console.error('Error generating link:', linkError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate tokens',
          message: '토큰 생성에 실패했습니다.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LinkResponse에서 토큰 직접 추출
    const accessToken = linkData.properties?.hashed_token;
    const refreshToken = linkData.properties?.refresh_token;

    // 혹은 action_link에서 토큰 추출 시도
    let access_token = accessToken;
    let refresh_token = refreshToken;

    if (!access_token && linkData.properties?.action_link) {
      try {
        const url = new URL(linkData.properties.action_link);
        const token = url.hash.replace('#', '');
        const params = new URLSearchParams(token);
        access_token = params.get('access_token');
        refresh_token = params.get('refresh_token');
      } catch (e) {
        console.error('Failed to parse action_link:', e);
      }
    }

    if (!access_token || !refresh_token) {
      console.error('Tokens not found in link data:', linkData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract tokens',
          message: '토큰 추출에 실패했습니다.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OTP verification successful for ${email}`);

    // 4. 성공 응답 (세션 토큰 포함)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP verification successful',
        access_token,
        refresh_token,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          email: email,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-otp-code function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
