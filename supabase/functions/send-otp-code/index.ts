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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase 클라이언트 생성 (service role)
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

    // 1. 6자리 랜덤 OTP 코드 생성
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 만료 시간 설정 (5분 후)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 3. 클라이언트 IP 가져오기
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // 4. 기존 미사용 코드가 있으면 삭제 (이메일당 1개만 유효)
    await supabaseAdmin
      .from('email_verification_codes')
      .delete()
      .eq('email', email)
      .is('used_at', null);

    // 5. 새 OTP 코드를 DB에 저장
    const { error: insertError } = await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        email,
        code: otpCode,
        expires_at: expiresAt,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error('Error inserting OTP code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 이메일 발송 (Resend 사용)
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        throw new Error('Email service not configured');
      }

      // 간단한 평문 이메일 (HTML 파싱 이슈 회피)
      const emailText = `
HOKEX 로그인 인증 코드

안녕하세요! HOKEX 로그인을 위한 인증 코드입니다.

인증 코드: ${otpCode}

⏱️ 유효 시간: 5분
🔒 보안: 타인에게 공유하지 마세요.
❓ 요청하지 않았나요? 이 이메일을 무시하세요.

© 2024 HOKEX. All rights reserved.
      `.trim();

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Onboarding <onboarding@resend.dev>', // Resend 기본 발신자 (정식 형식)
          to: [email],
          subject: `인증 코드: ${otpCode}`,
          text: emailText, // 평문 이메일 사용 (HTML 파싱 이슈 회피)
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('Resend API error:', errorData);
        throw new Error(`Email send failed: ${JSON.stringify(errorData)}`);
      }

      console.log(`OTP email sent to ${email}`);

    } catch (emailError: any) {
      console.error('Error sending OTP email:', emailError);
      
      // 이메일 전송 실패 시 대기 명단에 추가
      await supabaseAdmin
        .from('pending_approvals')
        .insert({
          email,
          reason: 'OTP_SEND_FAILED',
          error_message: emailError.message,
        });

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send OTP email',
          message: '이메일 전송에 실패했습니다. 관리자에게 승인을 요청해주세요.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. 성공 응답
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP code sent successfully',
        expiresIn: 300,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-otp-code function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
