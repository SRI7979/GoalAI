import { DM_Sans, Geist_Mono } from 'next/font/google'
import NetworkStatusBanner from '@/components/NetworkStatusBanner'
import './globals.css'

const bodyFont = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const monoFont = Geist_Mono({
  variable: '--font-code',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'PathAI — Learn Anything, Actually Finish It',
  description:
    'AI-powered adaptive learning platform that turns any skill into a gamified daily path. Set a goal, get daily tasks, prove mastery.',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050608',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${monoFont.variable} antialiased`}
        suppressHydrationWarning
      >
        <NetworkStatusBanner />
        {children}
      </body>
    </html>
  )
}
