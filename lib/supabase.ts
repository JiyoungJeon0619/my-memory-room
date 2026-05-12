import { createBrowserClient } from '@supabase/ssr'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// 1. 환경 변수를 미리 상수로 선언 (값이 없으면 빈 문자열 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// 브라우저용 (Client Components)
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}

// 서버용 (Server Components, API Routes)
export async function createServerSupabaseClient() {
  // 빌드 시 에러 방지를 위해 dynamic import와 try-catch 활용
  let cookieStore;
  try {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
  } catch (e) {
    // 빌드 타임에는 cookies()를 호출할 수 없으므로 무시
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore?.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore?.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore?.set({ name, value: '', ...options });
        } catch {}
      },
    },
  });
}