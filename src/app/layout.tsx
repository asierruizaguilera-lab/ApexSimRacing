import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/Providers'
import { SplashScreen } from '@/components/SplashScreen'
import { AvisoCookies } from '@/components/layout/AvisoCookies'

export const metadata: Metadata = {
  title: { default: 'APEX SimRacing', template: '%s | APEX SimRacing' },
  description: 'La comunidad hispanohablante de SimRacing y cultura del motor. Compite, clasifica y conecta.',
  keywords: ['simracing', 'campeonatos', 'assetto corsa', 'rally', 'drift', 'comunidad'],
  themeColor: '#C0392B',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo-apex-a.jpg', type: 'image/jpeg' },
    ],
    apple: { url: '/logo-apex-a.jpg', type: 'image/jpeg' },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-apex-bg text-apex-text min-h-screen antialiased">
        <SplashScreen>
          <Providers>{children}</Providers>
        </SplashScreen>
        <AvisoCookies />
      </body>
    </html>
  )
}
