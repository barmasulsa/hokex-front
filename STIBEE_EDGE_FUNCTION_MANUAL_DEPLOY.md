# Stibee Edge Function 수동 배포 가이드

## 문제 상황
- `subscribers.some is not a function` 에러 발생
- Stibee API 응답 구조가 예상과 다름

## 해결 방법: Supabase Dashboard에서 직접 배포

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (qmhxnxnaawtjelqlgyig)

### 2단계: Edge Function 수정
1. 왼쪽 메뉴에서 **Edge Functions** 클릭
2. `check-stibee-subscriber` 함수 선택
3. **Edit Function** 버튼 클릭

### 3단계: 코드 복사 & 붙여넣기
아래 전체 코드를 복사해서 붙여넣으세요:

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

    const ADMIN_EMAIL = 'lcw5525@naver.com'
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedAdminEmail = ADMIN_EMAIL.toLowerCase().trim()

    console.log(`🔍 Checking subscription for email: ${email}`)

    // Stibee API 설정
    const STIBEE_API_KEY = Deno.env.get('STIBEE_API_KEY')
    const STIBEE_LIST_ID = Deno.env.get('STIBEE_LIST_ID')

    if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
      console.error('❌ Stibee API credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stibee API로 구독자 목록 조회
    const stibeeUrl = `https://api.stibee.com/v1/lists/${STIBEE_LIST_ID}/subscribers`
    console.log(`📡 Fetching subscribers from Stibee: ${stibeeUrl}`)

    const stibeeResponse = await fetch(stibeeUrl, {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!stibeeResponse.ok) {
      console.error(`❌ Stibee API error: ${stibeeResponse.status} ${stibeeResponse.statusText}`)
      const errorText = await stibeeResponse.text()
      console.error(`Error details: ${errorText}`)
      return new Response(
        JSON.stringify({ error: 'Failed to check subscription', isSubscriber: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stibeeData = await stibeeResponse.json()
    console.log(`📊 Full Stibee response:`, JSON.stringify(stibeeData))

    // Stibee API 응답 구조 파악
    let subscribers: any[] = []
    
    // 다양한 응답 구조 처리
    if (Array.isArray(stibeeData)) {
      subscribers = stibeeData
    } else if (stibeeData.Ok && Array.isArray(stibeeData.Ok)) {
      subscribers = stibeeData.Ok
    } else if (stibeeData.value && Array.isArray(stibeeData.value)) {
      subscribers = stibeeData.value
    } else if (stibeeData.data && Array.isArray(stibeeData.data)) {
      subscribers = stibeeData.data
    } else if (stibeeData.subscribers && Array.isArray(stibeeData.subscribers)) {
      subscribers = stibeeData.subscribers
    } else {
      console.error('❌ Cannot find subscribers array in response:', Object.keys(stibeeData))
      console.error('❌ Response type:', typeof stibeeData)
      console.error('❌ Response structure:', JSON.stringify(stibeeData))
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Stibee API response format', 
          isSubscriber: false,
          rawData: stibeeData,
          debug: {
            keys: Object.keys(stibeeData),
            type: typeof stibeeData
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Total subscribers: ${subscribers.length}`)

    const isSubscriber = subscribers.some((subscriber: any) => {
      const subscriberEmail = subscriber.email?.toLowerCase().trim()
      return subscriberEmail === normalizedEmail
    })

    console.log(`🔍 Email ${email} found in Stibee: ${isSubscriber}`)

    if (!isSubscriber) {
      console.log(`❌ Not a subscriber: ${email}`)
      return new Response(
        JSON.stringify({ 
          isSubscriber: false,
          email: email,
          message: 'Not a subscriber'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 구독자인 경우 - 관리자 여부 체크
    const isAdmin = normalizedEmail === normalizedAdminEmail

    console.log(`✅ Subscriber access granted for: ${email}`)
    console.log(`🔑 Is admin: ${isAdmin}`)

    return new Response(
      JSON.stringify({ 
        isSubscriber: true,
        isAdmin: isAdmin,
        email: email,
        status: isAdmin ? 'ADMIN' : 'SUBSCRIBER',
        message: isAdmin ? 'Admin access granted' : 'Subscriber access granted'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', isSubscriber: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 4단계: 배포
1. **Deploy** 버튼 클릭
2. 배포 완료 대기 (약 10-30초)

### 5단계: 테스트
1. 프론트엔드에서 로그인 시도
2. 브라우저 콘솔에서 로그 확인
3. Supabase Dashboard > Edge Functions > Logs에서 상세 로그 확인

## 주요 변경사항
- Stibee API 응답의 다양한 구조를 모두 처리
- 배열을 찾지 못하면 디버깅 정보 반환
- 전체 응답을 로그에 출력하여 실제 구조 파악 가능

## 다음 단계
배포 후 로그인을 시도하면:
1. Edge Function 로그에서 실제 Stibee API 응답 구조 확인 가능
2. 필요시 추가 수정 가능
