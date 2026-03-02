import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Scale Monitor',
  description: 'Weighbridge management system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scale Monitor',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f0f4f0',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da" className="light" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="antialiased">
        <Providers>
          <div className="bg-blob" style={{ width: 400, height: 400, background: '#2e7d32', top: '-10%', left: '-5%' }} />
          <div className="bg-blob" style={{ width: 350, height: 350, background: '#4caf50', top: '50%', right: '-8%', animationDelay: '-7s' }} />
          <div className="bg-blob" style={{ width: 300, height: 300, background: '#1b5e20', bottom: '-5%', left: '30%', animationDelay: '-14s' }} />
          {children}
        </Providers>
      </body>
    </html>
  )
}
