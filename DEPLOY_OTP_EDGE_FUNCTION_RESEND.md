# 🚀 OTP Edge Function 배포 가이드 (Resend 이메일 포함)

## 📋 사전 준비

### 1. Resend API Key 발급받기

1. **Resend 가입**: https://resend.com/signup
2. **API Keys 메뉴** 이동
3. **"Create API Key"** 클릭
4. Key 이름 입력 (예: `HOKEX_OTP`)
5. **생성된 API Key 복사** (다시 볼 수 없으니 주의!)

### 2. 발신 도메인 설정 (옵션)

**무료 플랜도 가능하지만, 커스텀 도메인 사용을 권장합니다:**

- **무료 플랜**: `onboarding@resend.dev`에서 발송 (테스트용)
- **커스텀 도메인**: `noreply@hokex.kr`에서 발송 (프로덕션용)

커스텀 도메인 설정:
1. Resend Dashboard → **Domains**
2. **Add Domain** 클릭
3. `hokex.kr` 입력
4. DNS 레코드 추가 (Resend가 안내)
5. Verification 완료 대기

---

## 🚀 Supabase Edge Function 배포

### 방법 1: Dashboard에서 배포 (추천 - CLI 불필요)

#### 1단계: Supabase Dashboard 접속

1. https://supabase.com/dashboard 접속
2. **호켁스 프로젝트** 선택
3. 왼쪽 메뉴에서 **"Edge Functions"** 클릭

#### 2단계: 새 Function 생성

1. **"Create a new function"** 버튼 클릭
2. Function 이름 입력: `send-otp-code`
3. **"Create function"** 클릭

#### 3단계: Resend API Key 환경변수 설정

**먼저 환경변수를 설정해야 합니다!**

1. **Settings** → **Edge Functions** → **Environment Variables**
2. **Add variable** 클릭
3. 다음 추가:
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` (복사한 Resend API Key)
4. **Save** 클릭

#### 4단계: 코드 붙여넣기

코드 에디터에 아래 전체 코드를 붙여넣으세요:

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

    // 6. 이메일 발송 (Resend 사용)
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        throw new Error('Email service not configured');
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">HOKEX</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px;">전국 전시·컨벤션 정보 플랫폼</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px;">로그인 인증 코드</h2>
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">안녕하세요! HOKEX 로그인을 위한 인증 코드입니다.</p>
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 14px;">인증 코드</p>
        <p style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otpCode}</p>
      </div>
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⏱️ <strong>유효 시간:</strong> 5분<br>🔒 <strong>보안:</strong> 타인에게 공유하지 마세요.<br>❓ <strong>요청하지 않았나요?</strong> 이 이메일을 무시하세요.</p>
      </div>
    </div>
    <div style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2024 HOKEX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HOKEX <noreply@hokex.kr>',
          to: [email],
          subject: `[HOKEX] 로그인 인증 코드: ${otpCode}`,
          html: emailHtml,
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
```

#### 5단계: 배포

1. **"Deploy"** 버튼 클릭
2. 배포 완료 대기 (녹색 체크마크 확인)
3. Function URL 복사해두기

---

### 방법 2: Supabase CLI로 배포 (로컬에서)

#### CLI 설치 (이미 설치된 경우 생략):

```bash
npm install -g supabase
```

#### 배포 명령:

```bash
cd hokex-front
supabase functions deploy send-otp-code
```

#### 환경변수 설정:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ 배포 확인 및 테스트

### 1. Dashboard에서 테스트

1. **Edge Functions** → **send-otp-code** → **Invoke** 탭
2. Request Body 입력:
```json
{
  "email": "your-email@gmail.com"
}
```
3. **"Run"** 클릭
4. **응답 확인**:
```json
{
  "success": true,
  "message": "OTP code sent successfully",
  "expiresIn": 300
}
```
5. **이메일 확인**: 받은편지함에서 HOKEX 이메일 확인

### 2. DB에서 확인

SQL Editor에서 실행:

```sql
SELECT 
  email,
  code,
  expires_at,
  created_at,
  used_at,
  ip_address
FROM email_verification_codes
ORDER BY created_at DESC
LIMIT 5;
```

OTP 코드가 저장되었는지 확인하세요.

### 3. Logs 확인

**Edge Functions** → **send-otp-code** → **Logs** 탭에서:

- ✅ `OTP email sent to [email]` 메시지 확인
- ❌ 에러가 있다면 로그에서 원인 파악

---

## 🐛 트러블슈팅

### ❌ "RESEND_API_KEY not configured" 에러

**원인**: 환경변수가 설정되지 않음

**해결**:
1. Dashboard → Settings → Edge Functions → Environment Variables
2. `RESEND_API_KEY` 추가
3. Function 재배포

### ❌ "Email send failed: domain not verified"

**원인**: 커스텀 도메인(`hokex.kr`)이 인증되지 않음

**해결 (옵션 1 - 무료 플랜 도메인 사용)**:
코드 수정 (70번째 줄):
```typescript
from: 'HOKEX <onboarding@resend.dev>',
```

**해결 (옵션 2 - 도메인 인증)**:
1. Resend Dashboard → Domains
2. DNS 레코드 추가
3. Verification 완료 대기

### ❌ "Failed to generate OTP code" 에러

**원인**: DB 테이블이 없거나 RLS 문제

**해결**:
1. `create-otp-verification-system.sql` 마이그레이션 실행 확인
2. RLS 정책 확인:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'email_verification_codes';
```

### ❌ 이메일이 스팸함으로 가는 경우

**해결**:
1. **SPF, DKIM 설정** (Resend Dashboard에서 안내)
2. **발신 도메인 인증** 완료
3. Gmail 안전 발신자 등록

---

## 📊 모니터링

### 이메일 발송 현황 확인

**Resend Dashboard** → **Emails** 탭에서:
- 발송 성공/실패 확인
- 열람률 확인
- 바운스율 확인

### Edge Function 사용량 확인

**Supabase Dashboard** → **Edge Functions** → **Usage** 탭

---

## 💰 비용 정리

| 항목 | 무료 플랜 | 유료 플랜 |
|------|----------|----------|
| **Resend** | 월 3,000통 | $20/월 (50,000통) |
| **Supabase Edge Functions** | 500,000 invocations/월 | 추가 요금 발생 |

**예상 사용량 (호켁스)**:
- 일 100명 로그인 = 월 3,000통
- **무료 플랜으로 충분!**

---

## ✅ 완료 체크리스트

- [ ] Resend 가입 및 API Key 발급
- [ ] Supabase Dashboard에서 `RESEND_API_KEY` 환경변수 설정
- [ ] Edge Function 코드 붙여넣기 및 배포
- [ ] Dashboard에서 테스트 (이메일 수신 확인)
- [ ] DB에 OTP 코드 저장 확인
- [ ] Logs에서 에러 없는지 확인
- [ ] 실제 이메일 받았는지 확인

**모두 완료되면 프론트엔드에서 로그인 테스트를 진행하세요!**

---

## 🎉 다음 단계

1. ✅ **Edge Function 배포 완료**
2. ⬜ **프론트엔드 배포** (Git push → Vercel 자동 배포)
3. ⬜ **실제 로그인 테스트**
4. ⬜ **프로덕션 모니터링**
