// app/api/image/status/route.ts
// 클라이언트가 이미지 생성 완료 여부를 확인하기 위해 폴링하는 엔드포인트
// GET /api/image/status?memoryId=xxx

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase  = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const memoryId = request.nextUrl.searchParams.get('memoryId')
    if (!memoryId) return NextResponse.json({ error: 'memoryId required' }, { status: 400 })

    const { data: memory, error } = await supabase
      .from('memories')
      .select('id, image_url, image_status')
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .single()

    if (error || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    return NextResponse.json({
      memoryId:    memory.id,
      imageStatus: memory.image_status, // 'pending' | 'done' | 'error'
      imageUrl:    memory.image_url,    // done일 때만 값 있음
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
