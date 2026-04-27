import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CBH Price Engine',
  description: 'Custom Boxes Hub — Pricing Intelligence System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      </head>
      <body style={{fontFamily:"'DM Sans', -apple-system, sans-serif", background:'#080808', color:'#F5F5F7', margin:0}}>
        {children}
      </body>
    </html>
  )
}
