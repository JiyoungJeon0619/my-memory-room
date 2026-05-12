// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '기억의 방',
  description: '당신의 이야기가 머무는 곳',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: '기억의 방',
    description: '당신의 이야기가 머무는 곳',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&family=Gowun+Batang:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Gowun Batang', 'Noto Serif KR', serif;
            background: #FAF6EF;
            color: #28200F;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}