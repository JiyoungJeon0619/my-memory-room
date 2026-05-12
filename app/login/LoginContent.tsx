'use client'

import { useSearchParams } from 'next/navigation'
import SplashScreen from '@/components/SplashScreen'

export default function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div>
      {error && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#fee', border: '1px solid #fcc', borderRadius: 10,
          padding: '12px 20px', fontSize: 14, color: '#c00', zIndex: 100,
        }}>
          로그인 중 오류가 발생했어요. 다시 시도해주세요.
        </div>
      )}
      <SplashScreen />
    </div>
  )
}