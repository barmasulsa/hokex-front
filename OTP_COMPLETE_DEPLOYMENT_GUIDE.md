# 🎉 OTP 이메일 인증 시스템 배포 가이드 (완료판)

## 📋 완료된 작업

✅ **Step 1**: Edge Function `send-otp-code` 생성 및 배포  
✅ **Step 2**: Edge Function `verify-otp-code` 생성  
✅ **Step 3**: LoginPage UI 구현 (이미 완료)  
✅ **Step 4**: AuthContext 통합 (이미 완료)  

---

## 🚀 배포 순서

### 1단계: Resend API Key 설정 (이미 완료)

- Resend 가입: https://resend.com/signup
- API Key 발급 완료
- 무료 플랜: 월 3,000통 (호켁스 충분)

---

### 2단계: Edge Function 배포

#### A. `send-otp-code` 배포 (이미 완료 ✅)

1. Supabase Dashboard → **Edge Functions** → `send-otp-code` 선택
2. 이미 배포되어 있음 (테스트 완료)
3. 환경변수 `RESEND_API_KEY` 설정 완료

#### B. `verify-otp-code` 배포 (신규 ⚠️)

**중요**: 이 함수를 새로 배포해야 합니다!

##### 방법 1: Dashboard에서 배포 (추천)

1. Supabase Dashboard → **Edge Functions**
2. **"Create a new function"** 클릭
3. Function 이름: `verify-otp-code`
4. 아래 코드 전체 복사 → 붙여넣기:

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
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verifyError || !verificationData) {
      // 시도 횟수 증가
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ 
          attempts: (verificationData?.attempts || 0) + 1 
        })
        .eq('email', email)
        .eq('code', code);

      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired code',
          message: '인증 코드가 유효하지 않거나 만료되었습니다.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 코드 사용 처리
    await supabaseAdmin
      .from('email_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationData.id);

    // 3. 사용자 조회 (이메일로)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userData.users.find(u => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          message: '사용자를 찾을 수 없습니다.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Magic Link 발급 (자동 로그인용)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Magic Link URL에서 access_token과 refresh_token 추출
    const url = new URL(linkData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Tokens not found in magic link');
      return new Response(
        JSON.stringify({ error: 'Failed to create session tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OTP verification successful for ${email}`);

    // 6. 성공 응답 (토큰 포함)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP verification successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'bearer',
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
```

5. **"Deploy"** 버튼 클릭
6. 배포 완료 대기 (녹색 체크마크)

##### 방법 2: CLI로 배포

```bash
cd hokex-front
supabase functions deploy verify-otp-code
```

---

### 3단계: 프론트엔드 코드 확인

프론트엔드 코드는 이미 준비되어 있습니다:

- ✅ `LoginPage.tsx`: OTP UI 구현 완료
- ✅ `AuthContext.tsx`: `sendOTPCode()`, `verifyOTPCode()` 구현 완료

---

### 4단계: 배포 확인 및 테스트

#### A. Dashboard에서 `verify-otp-code` 테스트

**먼저 `send-otp-code`로 코드 발송:**

1. Edge Functions → `send-otp-code` → Invoke
2. Request Body:
```json
{
  "email": "lcw7914875@gmail.com"
}
```
3. Run → 이메일 수신 확인

**DB에서 OTP 코드 확인:**

SQL Editor에서:
```sql
SELECT code FROM email_verification_codes
WHERE email = 'lcw7914875@gmail.com'
ORDER BY created_at DESC
LIMIT 1;
```

코드를 복사하세요 (예: `123456`)

**이제 `verify-otp-code` 테스트:**

1. Edge Functions → `verify-otp-code` → Invoke
2. Request Body:
```json
{
  "email": "lcw7914875@gmail.com",
  "code": "123456"
}
```
3. Run → 성공 응답 확인:
```json
{
  "success": true,
  "message": "OTP verification successful",
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "bearer"
}
```

#### B. 프론트엔드에서 전체 플로우 테스트

**로컬 테스트 (개발 환경):**

```bash
cd hokex-front
npm run dev
```

1. http://localhost:5173/login 접속
2. "이메일 코드로 로그인" 클릭
3. 이메일 입력: `lcw7914875@gmail.com`
4. 이메일 받기
5. 6자리 코드 입력
6. "인증하기" 클릭
7. ✅ 로그인 성공 → 홈페이지로 리다이렉트

**프로덕션 배포:**

```bash
git add .
git commit -m "feat: OTP 이메일 인증 시스템 구현 완료"
git push origin main
```

Vercel이 자동 배포합니다.

---

## 🎯 사용자 플로우 요약

### 사용자가 보는 화면:

1. **로그인 페이지**: "이메일 코드로 로그인" 버튼 클릭
2. **이메일 입력**: 팝업에서 이메일 입력
3. **코드 발송**: "✅ 인증 코드가 이메일로 전송되었습니다" 알림
4. **코드 입력 화면**: 6자리 코드 입력 필드 + 타이머 (5분)
5. **인증 성공**: "✅ 인증 성공! 로그인되었습니다" → 홈으로 이동

### 백엔드 처리:

1. `send-otp-code` Edge Function → DB 저장 + Resend로 이메일 발송
2. `verify-otp-code` Edge Function → DB 검증 + JWT 토큰 발급
3. AuthContext → 토큰으로 세션 설정 → 로그인 완료

---

## ⚠️ 현재 제약사항 (Resend 무료 플랜)

**테스트 모드:**
- ✅ 본인 이메일(`lcw7914875@gmail.com`)로만 발송 가능
- ❌ 다른 사람 이메일로는 발송 불가

**해결 방법 (프로덕션 배포 시):**
1. Resend Dashboard → **Domains** → **Add Domain**
2. `hokex.kr` 추가
3. DNS 레코드 추가:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: Resend가 제공하는 값
4. Verification 완료 (1-2시간 소요)
5. `send-otp-code` 코드 수정:
```typescript
from: 'HOKEX <noreply@hokex.kr>',  // 현재: onboarding@resend.dev
```
6. 재배포

---

## ✅ 완료 체크리스트

### Edge Functions
- [x] `send-otp-code` 배포 및 테스트
- [ ] `verify-otp-code` 배포 **← 지금 해야 함!**
- [ ] `verify-otp-code` 테스트 (Dashboard Invoke)

### 프론트엔드
- [x] `LoginPage.tsx` OTP UI
- [x] `AuthContext.tsx` 통합
- [ ] 로컬 환경 테스트
- [ ] Git push → Vercel 배포

### 프로덕션 (선택사항)
- [ ] Resend 도메인 인증 (`hokex.kr`)
- [ ] `send-otp-code` 발신자 변경
- [ ] DNS 레코드 추가 (SPF, DKIM)

---

## 🐛 트러블슈팅

### ❌ "Failed to find user" 에러

**원인**: 사용자 계정이 없음

**해결**: 사용자가 이미 가입되어 있어야 함 (스티비 구독자)

### ❌ "Invalid or expired code" 에러

**원인**: 
- 코드가 틀림
- 코드가 만료됨 (5분 초과)
- 이미 사용된 코드

**해결**:
- "코드 재전송" 버튼으로 새 코드 받기
- DB에서 확인: `SELECT * FROM email_verification_codes WHERE email = '...'`

### ❌ 이메일이 안 옴

**원인**: Resend 무료 플랜 제약

**해결**:
- 본인 이메일(`lcw7914875@gmail.com`)로만 테스트
- 또는 도메인 인증 진행

---

## 📊 모니터링

### Edge Function Logs

**Dashboard → Edge Functions → Logs**에서:
- `send-otp-code`: "OTP email sent to [email]"
- `verify-otp-code`: "OTP verification successful for [email]"

### DB 확인

```sql
-- 최근 OTP 발급 내역
SELECT 
  email,
  code,
  created_at,
  expires_at,
  used_at,
  attempts
FROM email_verification_codes
ORDER BY created_at DESC
LIMIT 10;

-- 사용되지 않은 OTP
SELECT * FROM email_verification_codes
WHERE used_at IS NULL
  AND expires_at > NOW();
```

---

## 🎉 다음 단계

1. ⬜ **`verify-otp-code` Edge Function 배포** (지금!)
2. ⬜ **로컬 테스트** (npm run dev)
3. ⬜ **Git push → Vercel 배포**
4. ⬜ **실제 사용자 테스트**
5. ⬜ **프로덕션 도메인 인증** (선택)

**배포가 완료되면 사용자는 이메일 코드로 간편하게 로그인할 수 있습니다!** 🎊
