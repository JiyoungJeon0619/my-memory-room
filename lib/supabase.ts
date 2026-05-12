import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

// 1. 환경 변수 이름 확인 (이미지 f07071.jpg에서 확인된 이름과 100% 일치)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// 브라우저 클라이언트
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey)
}

// 서버 클라이언트 (headers 에러 방지를 위해 dynamic import 사용)
export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // 빌드 단계에서는 무시
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // 빌드 단계에서는 무시
        }
      },
    },
  })
}