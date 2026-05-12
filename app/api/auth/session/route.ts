import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const isNew = searchParams.get('isNew') // ✅ callback에서 넘겨준 파라미터 받기

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no_token', request.url))
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    })

    if (error) {
      console.error('[Session Error]', error)
      return NextResponse.redirect(new URL('/login?error=session_failed', request.url))
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=no_user', request.url))
    }

    // 1. 프로필 정보를 가져와서 온보딩 완료 여부(topics) 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, topics')
      .eq('id', user.id)
      .single()

    // 2. 신규 유저 판별 로직 수정
    // - 파라미터로 isNew=true가 넘어왔거나, 
    // - 기존 유저라도 topics(온보딩에서 선택하는 정보)가 없으면 온보딩으로 보냅니다.
    const needsOnboarding = isNew === 'true' || !profile?.topics || profile.topics.length === 0

    if (needsOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    } else {
      return NextResponse.redirect(new URL('/chat', request.url))
    }

  } catch (err: any) {
    console.error('[Session Error]', err)
    return NextResponse.redirect(new URL('/login?error=session_failed', request.url))
  }
}