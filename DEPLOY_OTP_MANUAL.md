# 🚨 OTP Edge Function 수동 배포 가이드

현재 상황: 500 에러 발생 중 → Edge Function이 배포되지 않았거나 이전 버전입니다.

---

## ⚡ 빠른 해결 방법

### 1단계: Supabase Dashboard 접속
1. 브라우저에서 https://supabase.com/dashboard 접속
2. 호켁스 프로젝트 선택
3. 왼쪽 메뉴에서 **"Edge Functions"** 클릭

### 2단계: verify-otp-code Function 확인

**2가지 경우:**

#### Case A: Function이 이미 있는 경우
1. `verify-otp-code` Function 클릭
2. **"Edit"** 버튼 클릭
3. 기존 코드를 모두 삭제
4. 아래 **[최신 코드]** 복사해서 붙여넣기
5. **"Deploy"** 클릭

#### Case B: Function이 없는 경우
1. **"Create a new function"** 클릭
2. Function name: `verify-otp-code`
3. **"Create function"** 클릭
4. 아래 **[최신 코드]** 복사해서 붙여넣기
5. **"Deploy"** 클릭

---

## 📋 최신 코드 (복사해서 붙여넣기)

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

  } catch (error) {
    console.error('Error in verify-otp-code function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 3단계: 배포 확인

배포가 완료되면:
1. ✅ 녹색 체크마크가 표시됩니다
2. ✅ "Successfully deployed" 메시지가 나타납니다

**배포 시간:** 약 10-30초 소요

---

## 4단계: 테스트

### Dashboard에서 즉시 테스트:

1. **"Invoke"** 탭 클릭
2. Request Body 입력:
```json
{
  "email": "lcw7914875@gmail.com",
  "code": "552525"
}
```
3. **"Run"** 버튼 클릭
4. **예상 응답:**
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

### 웹사이트에서 테스트:

1. 로그인 페이지 접속
2. 이메일: `lcw7914875@gmail.com`
3. 코드: `552525` 입력
4. **인증하기** 클릭
5. ✅ 로그인 성공해야 합니다!

---

## 🐛 트러블슈팅

### "500 Internal Server Error" 계속 발생:

**원인 1: 배포가 안 된 경우**
- 해결: Dashboard에서 Deploy 버튼을 다시 클릭
- 확인: "Successfully deployed" 메시지 확인

**원인 2: 환경 변수 누락**
- 해결: Dashboard → Settings → Edge Functions → Environment Variables
- 확인: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 존재 확인

**원인 3: DB 테이블 없음**
```sql
-- SQL Editor에서 실행
SELECT * FROM email_verification_codes 
WHERE email = 'lcw7914875@gmail.com';
```

### "Invalid or expired code" 에러:

**원인: 코드가 만료되었거나 이미 사용됨**

해결: 새 코드 생성
```sql
-- SQL Editor에서 실행
INSERT INTO email_verification_codes (email, code, expires_at, ip_address)
VALUES (
  'lcw7914875@gmail.com',
  '999999',
  NOW() + INTERVAL '5 minutes',
  'manual'
);
```

그리고 웹사이트에서 `999999` 입력

---

## ✅ 배포 완료 체크리스트

- [ ] Supabase Dashboard → Edge Functions 접속
- [ ] verify-otp-code Function 생성/수정
- [ ] 위의 최신 코드 붙여넣기
- [ ] Deploy 버튼 클릭
- [ ] "Successfully deployed" 확인
- [ ] Dashboard에서 Invoke 테스트 성공
- [ ] 웹사이트에서 로그인 테스트 성공

**모든 항목 완료 시 → 500 에러 해결! 🎉**

---

## 📞 추가 도움이 필요한 경우

배포가 안 되거나 에러가 계속 발생하면:

1. **Logs 확인:**
   - Dashboard → Edge Functions → verify-otp-code → **Logs** 탭
   - 최근 에러 메시지 확인

2. **에러 메시지 공유:**
   - Logs에 나온 에러 메시지를 복사해서 알려주세요
   - 정확한 문제 파악 가능

3. **DB 상태 확인:**
   ```sql
   SELECT * FROM email_verification_codes 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

**다시 시도해보고 결과 알려주세요!**
