# Edge Function 배포 가이드 (CLI 방식)

## 문제 상황
Supabase Dashboard에서 배포했는데도 개발 우회 코드가 실행되지 않음

## 해결 방법: Supabase CLI로 배포

### 1. Supabase CLI 설치 (이미 설치되어 있으면 스킵)

```bash
# Windows (PowerShell)
scoop install supabase

# 또는 npm으로 설치
npm install -g supabase
```

### 2. Supabase 로그인

```bash
cd hokex-front
supabase login
```

브라우저가 열리면 로그인 진행

### 3. 프로젝트 연결

```bash
# 프로젝트 ID 확인: Supabase Dashboard → Project Settings → General → Reference ID
supabase link --project-ref YOUR_PROJECT_ID
```

### 4. Edge Function 배포

```bash
supabase functions deploy check-stibee-subscriber
```

### 5. 환경 변수 설정 (이미 설정되어 있으면 스킵)

```bash
supabase secrets set STIBEE_API_KEY=52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
supabase secrets set STIBEE_LIST_ID=289942
```

### 6. 배포 확인

```bash
# 함수 목록 확인
supabase functions list

# 로그 확인
supabase functions logs check-stibee-subscriber
```

## 대안: 코드 직접 수정 후 Dashboard 재배포

만약 CLI 설치가 어렵다면:

1. **Supabase Dashboard 접속**
2. **Edge Functions → check-stibee-subscriber**
3. **기존 코드 전체 삭제**
4. **아래 코드 복사 붙여넣기**
5. **Deploy 버튼 클릭**

```typescript
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

    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('Missing Stibee configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ⭐ 개발 우회: 특정 이메일은 항상 허용
    const ALLOWED_EMAILS = ['lcw5525@naver.com']
    if (ALLOWED_EMAILS.includes(email.toLowerCase())) {
      console.log(`✅ Development bypass: ${email} is in allowed list`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: true,
          email: email,
          status: 'DEVELOPMENT_BYPASS',
          message: 'Development bypass enabled'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking subscription for email: ${email}`)
    console.log(`Using List ID: ${STIBEE_LIST_ID}`)
    
    const stibeeResponse = await fetch(
      `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log(`Stibee API response status: ${stibeeResponse.status}`)

    if (stibeeResponse.ok) {
      const subscriberData = await stibeeResponse.json()
      console.log('Full Stibee response:', JSON.stringify(subscriberData, null, 2))
      
      const status = subscriberData.status || subscriberData.subscriber?.status || subscriberData.state
      const isSubscribed = status === 'SUBSCRIBED' || status === 'subscribed' || status === 'ACTIVE' || status === 'active'
      
      console.log(`Is subscribed: ${isSubscribed}, Status: ${status}`)
      
      return new Response(
        JSON.stringify({ 
          isSubscriber: isSubscribed,
          email: email,
          status: status,
          rawData: subscriberData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (stibeeResponse.status === 404) {
      console.log('Subscriber not found (404)')
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not a subscriber' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorText = await stibeeResponse.text()
      console.error('Stibee API error:', stibeeResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify subscription', 
          isSubscriber: false,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
```

## 배포 후 테스트

1. **브라우저 캐시 완전 삭제**
   - Chrome: Ctrl+Shift+Delete
   - "전체 기간" 선택
   - "캐시된 이미지 및 파일" 체크
   - 삭제

2. **시크릿 모드로 테스트**
   - Ctrl+Shift+N (Chrome)
   - https://hokex.vercel.app 접속
   - 로그인 시도

3. **콘솔 확인**
   - F12 → Console 탭
   - 다음 메시지가 보여야 함:
     ```
     ✅ Development bypass: lcw5525@naver.com is in allowed list
     Is subscriber: true Status: DEVELOPMENT_BYPASS
     ```

## 여전히 안 되는 경우

### 옵션 1: Edge Function URL 직접 테스트

```bash
# PowerShell에서 실행
$body = @{ email = "lcw5525@naver.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-stibee-subscriber" -Method POST -Body $body -ContentType "application/json" -Headers @{ "Authorization" = "Bearer YOUR_ANON_KEY" }
```

### 옵션 2: 함수 재생성

1. Dashboard에서 기존 함수 삭제
2. 새로 생성
3. 위 코드 붙여넣기
4. Deploy

### 옵션 3: 임시로 모든 이메일 허용

개발 우회 부분을 이렇게 수정:

```typescript
// 임시: 모든 이메일 허용 (테스트용)
console.log(`✅ TEMPORARY: Allowing all emails for testing`)
return new Response(
  JSON.stringify({ 
    isSubscriber: true,
    email: email,
    status: 'TEMPORARY_BYPASS'
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

이렇게 하면 모든 이메일이 로그인 가능합니다. 테스트 후 다시 원래대로 되돌려야 합니다.
