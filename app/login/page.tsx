// app/login/page.tsx
import { Suspense } from 'react'
import LoginContent from './LoginContent'

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  )
}