# OTP Edge Function 배포 가이드

## 🚀 Supabase Dashboard에서 배포하기 (추천)

Supabase CLI가 없어도 Dashboard에서 직접 배포할 수 있습니다!

---

## 1단계: Supabase Dashboard 접속

1. https://supabase.com/dashboard 접속
2. 호켁스 프로젝트 선택
3. 왼쪽 메뉴에서 **"Edge Functions"** 클릭

---

## 2단계: 새 Function 생성

1. **"Create a new function"** 버튼 클릭
2. Function 이름 입력: `send-otp-code`
3. **"Create function"** 클릭

---

## 3단계: 코드 붙여넣기

1. 코드 에디터가 열리면 기본 코드를 모두 삭제
2. 아래 코드를 복사하여 붙여넣기:

```typescript
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

    // 6. 이메일 발송 (간단한 텍스트 이메일)
    // TODO: 실제 이메일 발송 로직 구현 필요
    // 현재는 코드만 생성하고 DB에 저장
    
    console.log(`OTP Code for ${email}: ${otpCode}`);

    // 7. 성공 응답
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP code sent successfully',
        expiresIn: 300, // 5분 (초 단위)
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
```

3. **"Deploy"** 버튼 클릭

---

## 4단계: 배포 확인

1. 배포가 완료되면 녹색 체크마크가 표시됩니다
2. Function URL이 생성됩니다 (복사해두세요)

예시: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-otp-code`

---

## 5단계: 테스트

### Dashboard에서 테스트:

1. **"Invoke"** 탭 클릭
2. Request Body 입력:
```json
{
  "email": "test@example.com"
}
```
3. **"Run"** 버튼 클릭
4. 응답 확인:
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```

### 코드에서 테스트:

```typescript
// AuthContext.tsx의 sendOTPCode 함수가 자동으로 호출합니다
const { data, error } = await supabase.functions.invoke('send-otp-code', {
  body: { email },
});
```

---

## ⚠️ 중요: 이메일 발송 설정

현재 코드는 **OTP 코드를 생성하고 DB에 저장**만 합니다.

실제 이메일 발송을 위해서는 다음 중 하나를 선택해야 합니다:

### 옵션 1: Supabase Auth 이메일 사용 (무료)
- Supabase가 제공하는 기본 이메일 서비스
- 제한: 하루 500통
- 설정 필요 없음 (자동)

### 옵션 2: SendGrid (추천)
- 무료 플랜: 하루 100통
- 안정적인 전송률
- 설정 필요: API Key

### 옵션 3: Resend
- 무료 플랜: 월 3,000통
- 현대적인 API
- 설정 필요: API Key

---

## 📝 다음 단계

1. ✅ **DB 마이그레이션 실행** (create-otp-verification-system.sql)
2. ✅ **Edge Function 배포** (이 가이드)
3. ⬜ **이메일 발송 설정** (선택사항)
4. ⬜ **Frontend 배포** (Git push → Vercel)
5. ⬜ **테스트**

---

## 🐛 트러블슈팅

### Edge Function이 실행되지 않는 경우:

1. **Function URL 확인**
   - Dashboard → Edge Functions → send-otp-code → Details
   - URL이 맞는지 확인

2. **Logs 확인**
   - Dashboard → Edge Functions → send-otp-code → Logs
   - 에러 메시지 확인

3. **DB 테이블 확인**
   ```sql
   SELECT * FROM email_verification_codes LIMIT 1;
   ```
   - 테이블이 생성되었는지 확인

4. **RLS 정책 확인**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'email_verification_codes';
   ```
   - service_role이 접근 가능한지 확인

---

## ✅ 배포 완료 체크리스트

- [ ] Supabase Dashboard에서 Edge Function 생성
- [ ] 코드 붙여넣기 및 배포
- [ ] Function URL 복사
- [ ] Dashboard에서 테스트 실행
- [ ] 성공 응답 확인
- [ ] DB에 OTP 코드 저장 확인

**모든 항목을 완료하면 다음 단계(Frontend 배포)로 진행하세요!**
