// app/api/auth/kakao/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    console.log('[Kakao Debug] CLIENT_ID:', process.env.KAKAO_CLIENT_ID)
    console.log('[Kakao Debug] REDIRECT_URI:', process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI)
    console.log('[Kakao Debug] code:', code)
    // 1. 카카오에 code로 access_token 요청 (client_secret 없이)
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
       grant_type:   'authorization_code',
        client_id:    'ad24f55b011490517d71c8562bc3c92d',
       redirect_uri: 'https://memory-room-tk2d.vercel.app/api/auth/kakao/callback',
       code,
      }),
    })
    const tokenData = await tokenRes.json()
    console.log('[Kakao Token Response]', JSON.stringify(tokenData))
    if (!tokenData.access_token) throw new Error('카카오 토큰 발급 실패')

    // 2. 카카오 유저 정보 가져오기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const kakaoUser = await userRes.json()
    const kakaoId   = String(kakaoUser.id)
    const nickname  = kakaoUser.kakao_account?.profile?.nickname || ''
    const avatarUrl = kakaoUser.kakao_account?.profile?.profile_image_url || null

    // 3. 기존 유저 조회
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('kakao_id', kakaoId)
      .single()

    let userId: string

    if (existingProfile) {
      userId = existingProfile.id
    } else {
      // 4. 신규 유저 생성
      const email = `kakao_${kakaoId}@memory-room.app`
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
      })
      if (createError || !newUser.user) throw createError

      userId = newUser.user.id

      await supabaseAdmin.from('profiles').insert({
        id:         userId,
        kakao_id:   kakaoId,
        name:       nickname,
        avatar_url: avatarUrl,
      })
    }

// ... 기존 코드 (생략)

    // 5. 매직링크로 세션 생성
    // 84번 라인 근처부터 끝까지 덮어쓰세요
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `kakao_${kakaoId}@memory-room.app`,
    })
    if (linkError || !linkData) throw linkError

    const token = linkData.properties?.hashed_token
    const redirectTo = new URL('/api/auth/session', request.url)
    redirectTo.searchParams.set('token', token)
    redirectTo.searchParams.set('userId', userId)

    // ✅ 신규 유저라면 온보딩으로 보내기 위한 표식 추가
    if (!existingProfile) {
      redirectTo.searchParams.set('isNew', 'true')
    }

    return NextResponse.redirect(redirectTo)

  } catch (err: any) {
    console.error('[Kakao Callback Error]', err)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
} // 이 중괄호가 GET 함수를 닫습니다.