import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY');
const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID');

serve(async (req) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

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

    console.log('Unsubscribing email:', email);

    // 1. Stibee API로 구독 해지 (DELETE 메서드 사용)
    // Stibee API는 DELETE 요청 시 body에 이메일 배열을 전달
    const stibeeResponse = await fetch(
      `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers`,
      {
        method: 'DELETE',
        headers: {
          'AccessToken': STIBEE_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([email]), // 이메일 배열로 전달
      }
    );

    console.log('Stibee API response status:', stibeeResponse.status);
    
    if (!stibeeResponse.ok) {
      const errorText = await stibeeResponse.text();
      console.error('Stibee API error response:', errorText);
      console.error('Stibee API error status:', stibeeResponse.status);
      
      // 404는 이미 삭제된 경우일 수 있으므로 계속 진행
      if (stibeeResponse.status !== 404) {
        throw new Error(`Stibee API error: ${stibeeResponse.status} - ${errorText}`);
      } else {
        console.log('Subscriber not found in Stibee (404), continuing with account deletion...');
      }
    } else {
      const stibeeData = await stibeeResponse.json();
      console.log('Stibee unsubscribe response:', JSON.stringify(stibeeData));
    }

    // 2. Supabase에서 사용자 데이터 삭제
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Failed to get user from token');
    }

    console.log('Deleting data for user:', user.id);

    // saved_events 삭제
    const { error: savedEventsError } = await supabaseClient
      .from('saved_events')
      .delete()
      .eq('user_id', user.id);

    if (savedEventsError) {
      console.error('Error deleting saved events:', savedEventsError);
    }

    // user_profiles에서 닉네임 삭제 (행은 유지, 닉네임만 null로)
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .update({ nickname: null })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error clearing nickname:', profileError);
    }

    // 3. Supabase Auth에서 계정 삭제
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('Successfully unsubscribed and deleted user:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully unsubscribed and deleted account'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in unsubscribe-stibee function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
