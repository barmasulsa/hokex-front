// Public userinfo adapter for the Naver OAuth response shape.
// Naver returns the stable identifier inside `response.id`, while Supabase's
// generic OAuth provider expects a top-level `id` or `sub` field.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return Response.json({ error: 'Missing provider access token' }, { status: 401, headers: corsHeaders })
  }

  const naverResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: authorization },
  })

  const payload = await naverResponse.json()
  const profile = payload?.response

  if (!naverResponse.ok || !profile?.id) {
    return Response.json({ error: 'Unable to read Naver profile' }, { status: 502, headers: corsHeaders })
  }

  return Response.json({
    id: String(profile.id),
    sub: String(profile.id),
    email: profile.email ?? undefined,
    name: profile.name ?? profile.nickname ?? undefined,
    picture: profile.profile_image ?? undefined,
  }, { headers: corsHeaders })
})
