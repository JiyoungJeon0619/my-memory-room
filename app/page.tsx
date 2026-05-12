// app/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import SplashScreen from '@/components/SplashScreen'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  //if (user) redirect('/chat')

  return <SplashScreen />
}